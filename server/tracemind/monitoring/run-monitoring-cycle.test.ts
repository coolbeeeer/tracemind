import { describe, expect, it, vi } from "vitest";
import { runMonitoringCycle } from "./run-monitoring-cycle.js";
import type { IncidentStore } from "./incident-store.js";
import type { StoredIncident } from "./reconcile-incidents.js";
import type { LogEntry } from "../../../shared/tracemind/models.js";

describe("Cloud Run monitoring cycle", () => {
  it("persists one incident and related redacted logs", async () => {
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
    const entries = [0, 1, 2].map(i => ({
      insertId: `log-${i}`,
      timestamp: new Date(Date.UTC(2026, 9, 29, 0, i)).toISOString(),
      severity: "ERROR",
      textPayload: `Database failure 100 password=abc123`,
      httpRequest: { status: 500 },
    }));
    const request = vi.fn(async () => new Response(JSON.stringify({ entries }), {
      status: 200, headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const result = await runMonitoringCycle({
      query: {
        projectId: "tracemind-dev-123",
        serviceName: "payments",
        since: "2026-10-29T00:00:00.000Z",
      },
      accessToken: "fake-token-for-test",
      store,
      request,
    });
    expect(result.createdIncidents).toBe(1);
    expect(result.storedLogs).toBe(3);
    expect(records[0].incident.demo).toBe(false);
    expect(logs.every(log => log.incidentId === records[0].incident.id)).toBe(true);
    expect(logs[0].message).toContain("password=[REDACTED]");
  });
});
