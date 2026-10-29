import { normalizeCloudRunLog, type CloudLoggingEntry } from "./cloud-run-normalizer.js";
import type { MonitoringEvent } from "./detect-incidents.js";

export interface CloudRunLogQuery {
  projectId: string;
  serviceName: string;
  region?: string;
  since: string;
  pageSize?: number;
  maxPages?: number;
}

/**
 * Read-only Cloud Logging REST adapter. Call only from the server.
 * Obtain a short-lived OAuth token from the runtime's authorized credential
 * provider (e.g. workload identity); never accept tokens from browser input.
 */
export async function fetchCloudRunLogs(
  query: CloudRunLogQuery,
  accessToken: string,
  request: typeof fetch = fetch,
): Promise<MonitoringEvent[]> {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(query.projectId)) {
    throw new Error("Invalid GCP project ID");
  }
  if (!/^[a-z][a-z0-9-]{0,47}[a-z0-9]$/.test(query.serviceName)) {
    throw new Error("Invalid Cloud Run service name");
  }
  if (!Number.isFinite(Date.parse(query.since))) throw new Error("Invalid since timestamp");
  if (!accessToken) throw new Error("Server-side Google Cloud authorization is required");
  const pageSize = Math.min(1000, Math.max(1, query.pageSize ?? 250));
  const maxPages = Math.min(20, Math.max(1, query.maxPages ?? 4));
  const escapeFilter = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const filters = [
    'resource.type="cloud_run_revision"',
    `resource.labels.service_name="${escapeFilter(query.serviceName)}"`,
    `timestamp>="${new Date(query.since).toISOString()}"`,
  ];
  if (query.region) filters.push(`resource.labels.location="${escapeFilter(query.region)}"`);

  const events: MonitoringEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const response = await request("https://logging.googleapis.com/v2/entries:list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resourceNames: [`projects/${query.projectId}`],
        filter: filters.join(" AND "),
        orderBy: "timestamp asc",
        pageSize,
        ...(pageToken ? { pageToken } : {}),
      }),
    });
    if (!response.ok) {
      // Avoid echoing response bodies: providers can include sensitive details.
      throw new Error(`Cloud Logging request failed (HTTP ${response.status})`);
    }
    const body = await response.json() as {
      entries?: CloudLoggingEntry[];
      nextPageToken?: string;
    };
    for (const entry of body.entries ?? []) {
      const event = normalizeCloudRunLog(entry, query.serviceName);
      if (event) events.push(event);
    }
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return events;
}
