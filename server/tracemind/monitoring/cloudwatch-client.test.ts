import { describe, expect, it, vi } from "vitest";
import {
  fetchCloudWatchLogs,
  signCloudWatchRequest,
} from "./cloudwatch-client.js";

const query = {
  region: "ap-south-1",
  logGroupName: "/aws/lambda/payments",
  since: "2026-10-30T00:00:00.000Z",
};

const credentials = {
  accessKeyId: "AKIDEXAMPLE123456789",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
};

function page(events: unknown[], nextToken?: string) {
  return async () =>
    new Response(JSON.stringify({ events, ...(nextToken ? { nextToken } : {}) }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
}

function errorEvent(i: number) {
  return {
    eventId: `evt-${i}`,
    timestamp: Date.UTC(2026, 9, 30, 12, i, 0),
    message: `ERROR: database failure ${100 + i}`,
  };
}

describe("CloudWatch SigV4 signing", () => {
  it("produces a well-formed authorization header for the logs service", () => {
    const signed = signCloudWatchRequest({
      region: "ap-south-1",
      credentials,
      body: '{"logGroupName":"/aws/lambda/payments"}',
      amzDate: "20261030T120000Z",
    });
    expect(signed.url).toBe("https://logs.ap-south-1.amazonaws.com/");
    expect(signed.headers["x-amz-target"]).toBe("Logs_20140328.FilterLogEvents");
    expect(signed.headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE123456789\/20261030\/ap-south-1\/logs\/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=[0-9a-f]{64}$/,
    );
  });

  it("signing is deterministic for identical inputs", () => {
    const input = {
      region: "ap-south-1",
      credentials,
      body: '{"logGroupName":"/aws/lambda/payments"}',
      amzDate: "20261030T120000Z",
    };
    expect(signCloudWatchRequest(input).headers.Authorization).toBe(
      signCloudWatchRequest(input).headers.Authorization,
    );
  });
});

describe("CloudWatch pagination", () => {
  it("throws instead of returning a partial set when the page limit is reached with a continuation token", async () => {
    const request = vi.fn(page([errorEvent(0)], "next-page")) as unknown as typeof fetch;
    await expect(
      fetchCloudWatchLogs({ ...query, maxPages: 1 }, credentials, request),
    ).rejects.toThrow(/pagination truncated/);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("collects all pages when the final page has no continuation token", async () => {
    const request = vi
      .fn()
      .mockImplementationOnce(page([errorEvent(0)], "next-page"))
      .mockImplementationOnce(page([errorEvent(1)])) as unknown as typeof fetch;
    const events = await fetchCloudWatchLogs(
      { ...query, maxPages: 2 },
      credentials,
      request,
    );
    expect(events).toHaveLength(2);
    expect(events[0]?.severity).toBe("ERROR");
  });

  it("rejects bad regions, log groups, and timestamps before any request", async () => {
    const request = vi.fn() as unknown as typeof fetch;
    await expect(
      fetchCloudWatchLogs({ ...query, region: "not-a-region" }, credentials, request),
    ).rejects.toThrow(/Invalid AWS region/);
    await expect(
      fetchCloudWatchLogs({ ...query, logGroupName: "bad;group" }, credentials, request),
    ).rejects.toThrow(/Invalid CloudWatch log group/);
    await expect(
      fetchCloudWatchLogs({ ...query, since: "yesterday" }, credentials, request),
    ).rejects.toThrow(/Invalid since timestamp/);
    expect(request).not.toHaveBeenCalled();
  });

  it("reports the status without echoing the provider body", async () => {
    const request = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "The security token is hunter2" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;
    await expect(
      fetchCloudWatchLogs(query, credentials, request),
    ).rejects.toThrow("CloudWatch Logs request failed (HTTP 403)");
    await expect(
      fetchCloudWatchLogs(query, credentials, request),
    ).rejects.not.toThrow(/hunter2/);
  });
});
