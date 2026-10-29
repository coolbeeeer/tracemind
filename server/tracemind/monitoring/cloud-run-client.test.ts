import { describe, expect, it, vi } from "vitest";
import { fetchCloudRunLogs } from "./cloud-run-client.js";
import { runMonitoringCycle } from "./run-monitoring-cycle.js";
import type { IncidentStore } from "./incident-store.js";
import type { StoredIncident } from "./reconcile-incidents.js";
import type { LogEntry } from "../../../shared/tracemind/models.js";

const query = {
  projectId: "tracemind-dev-123",
  serviceName: "payments",
  since: "2026-10-29T00:00:00.000Z",
};

function page(entries: unknown[], nextPageToken?: string) {
  return async () =>
    new Response(JSON.stringify({ entries, ...(nextPageToken ? { nextPageToken } : {}) }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
}

function errorEntry(i: number) {
  return {
    insertId: `log-${i}`,
    timestamp: new Date(Date.UTC(2026, 9, 29, 0, i)).toISOString(),
    severity: "ERROR",
    textPayload: "Database failure 100",
    httpRequest: { status: 500 },
  };
}

describe("Cloud Logging pagination", () => {
  it("throws instead of returning a partial set when the page limit is reached with a continuation token", async () => {
    const request = vi.fn(page([errorEntry(0)], "next-page")) as unknown as typeof fetch;
    await expect(
      fetchCloudRunLogs({ ...query, maxPages: 1 }, "fake-token-for-test", request),
    ).rejects.toThrow(/pagination truncated/);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("collects all pages when the final page has no continuation token", async () => {
    const request = vi
      .fn()
      .mockImplementationOnce(page([errorEntry(0)], "next-page"))
      .mockImplementationOnce(page([errorEntry(1)])) as unknown as typeof fetch;
    const events = await fetchCloudRunLogs(
      { ...query, maxPages: 2 },
      "fake-token-for-test",
      request,
    );
    expect(events).toHaveLength(2);
  });

  it("a truncated poll persists nothing, so a checkpoint can never advance past unread logs", async () => {
    const records: StoredIncident[] = [];
    const logs: LogEntry[] = [];
    const store = {
      listOpenRecords: vi.fn(async () => records),
      upsertRecords: vi.fn(async (items: readonly StoredIncident[]) => {
        records.push(...items);
      }),
      upsertLogs: vi.fn(async (items: readonly LogEntry[]) => {
        logs.push(...items);
      }),
    } as unknown as IncidentStore;
    const request = vi.fn(page([errorEntry(0)], "next-page")) as unknown as typeof fetch;
    await expect(
      runMonitoringCycle({ query: { ...query, maxPages: 1 }, accessToken: "fake-token-for-test", store, request }),
    ).rejects.toThrow(/pagination truncated/);
    expect(records).toHaveLength(0);
    expect(logs).toHaveLength(0);
  });
});
