import { createHash, createHmac } from "node:crypto";
import { normalizeCloudWatchLog } from "./cloudwatch-normalizer.js";
import type { MonitoringEvent } from "./detect-incidents.js";

export interface CloudWatchLogQuery {
  region: string;
  logGroupName: string;
  since: string;
  filterPattern?: string;
  pageSize?: number;
  maxPages?: number;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * Signs a CloudWatch Logs request with AWS Signature Version 4.
 * Exported for tests: the header shape and credential scope are the
 * contract; the live proof is a real call with the user's credentials.
 */
export function signCloudWatchRequest(input: {
  region: string;
  credentials: AwsCredentials;
  body: string;
  amzDate?: string;
}): { url: string; headers: Record<string, string> } {
  const amzDate =
    input.amzDate ??
    new Date().toISOString().replace(/[:-]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const host = `logs.${input.region}.amazonaws.com`;
  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.1",
    host,
    "x-amz-date": amzDate,
    "x-amz-target": "Logs_20140328.FilterLogEvents",
  };
  if (input.credentials.sessionToken) {
    headers["x-amz-security-token"] = input.credentials.sessionToken;
  }
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map(name => `${name}:${headers[name]!.trim()}\n`)
    .join("");
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaderNames.join(";"),
    sha256Hex(input.body),
  ].join("\n");
  const scope = `${dateStamp}/${input.region}/logs/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kSigning = hmac(
    hmac(hmac(hmac(`AWS4${input.credentials.secretAccessKey}`, dateStamp), input.region), "logs"),
    "aws4_request",
  );
  const signature = hmac(kSigning, stringToSign).toString("hex");
  return {
    url: `https://${host}/`,
    headers: {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`,
    },
  };
}

/**
 * Read-only CloudWatch Logs adapter. Call only from the server.
 * Credentials arrive as parameters from the caller (resolved from the
 * server-side vault); never accept them from browser input. No AWS SDK
 * is required, mirroring the Cloud Logging client: plain fetch plus
 * SigV4 signing, so the only dependency is node:crypto.
 */
export async function fetchCloudWatchLogs(
  query: CloudWatchLogQuery,
  credentials: AwsCredentials,
  request: typeof fetch = fetch,
): Promise<MonitoringEvent[]> {
  if (!/^[a-z]{2}(-gov)?-[a-z]+-\d$/.test(query.region)) {
    throw new Error("Invalid AWS region");
  }
  if (
    query.logGroupName.length < 1 ||
    query.logGroupName.length > 512 ||
    !/^[\.\-_/#A-Za-z0-9]+$/.test(query.logGroupName)
  ) {
    throw new Error("Invalid CloudWatch log group name");
  }
  if (!Number.isFinite(Date.parse(query.since))) {
    throw new Error("Invalid since timestamp");
  }
  if (!/^[A-Za-z0-9]{16,128}$/.test(credentials.accessKeyId)) {
    throw new Error("Server-side AWS access key is required");
  }
  if (
    typeof credentials.secretAccessKey !== "string" ||
    credentials.secretAccessKey.length < 16 ||
    /\s/.test(credentials.secretAccessKey)
  ) {
    throw new Error("Server-side AWS secret key is required");
  }
  const pageSize = Math.min(1000, Math.max(1, query.pageSize ?? 250));
  const maxPages = Math.min(20, Math.max(1, query.maxPages ?? 4));
  const startTime = Date.parse(query.since);

  const events: MonitoringEvent[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const body = JSON.stringify({
      logGroupName: query.logGroupName,
      startTime,
      interleaved: true,
      limit: pageSize,
      ...(query.filterPattern ? { filterPattern: query.filterPattern } : {}),
      ...(nextToken ? { nextToken } : {}),
    });
    const signed = signCloudWatchRequest({
      region: query.region,
      credentials,
      body,
    });
    const response = await request(signed.url, {
      method: "POST",
      headers: signed.headers,
      body,
    });
    if (!response.ok) {
      // Avoid echoing response bodies: providers can include sensitive details.
      throw new Error(`CloudWatch Logs request failed (HTTP ${response.status})`);
    }
    const payload = (await response.json()) as {
      events?: { eventId?: string; timestamp?: number; message?: string }[];
      nextToken?: string;
    };
    for (const event of payload.events ?? []) {
      const normalized = normalizeCloudWatchLog(event, query.logGroupName);
      if (normalized) events.push(normalized);
    }
    nextToken = payload.nextToken;
    if (!nextToken) break;
  }
  if (nextToken) {
    // Same rule as the Cloud Logging client: the page limit was reached
    // while CloudWatch still has more events. Returning the partial set
    // would present an incomplete collection as a success, and a polling
    // checkpoint would then advance past logs that were never read.
    // Fail instead, so the checkpoint stays where it was.
    throw new Error(
      "CloudWatch Logs pagination truncated: more events remain after the configured page limit",
    );
  }
  return events;
}
