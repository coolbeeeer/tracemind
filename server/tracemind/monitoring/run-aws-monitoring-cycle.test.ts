import { describe, expect, it, vi } from "vitest";
import { runAwsMonitoringCycle } from "./run-aws-monitoring-cycle.js";
import type { IncidentStore } from "./incident-store.js";
import type { StoredIncident } from "./reconcile-incidents.js";
import type { LogEntry } from "../../../shared/tracemind/models.js";

describe("CloudWatch monitoring cycle", () => {
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
    const events = [0, 1, 2].map(i => ({
      eventId: `evt-${i}`,
      timestamp: Date.UTC(2026, 9, 30, 12, i, 0),
      message: `ERROR: database failure 100 password=hunter2`,
    }));
    const request = vi.fn(async () => new Response(JSON.stringify({ events }), {
      status: 200, headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const result = await runAwsMonitoringCycle({
      query: {
        region: "ap-south-1",
        logGroupName: "/aws/lambda/payments",
        since: "2026-10-30T00:00:00.000Z",
      },
      credentials: {
        accessKeyId: "AKIDEXAMPLE123456789",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      },
      store,
      request,
    });
    expect(result.createdIncidents).toBe(1);
    expect(result.storedLogs).toBe(3);
    expect(records[0]?.incident.demo).toBe(false);
    expect(logs.every(log => log.incidentId === records[0]?.incident.id)).toBe(true);
    expect(logs[0]?.message).toContain("password=[REDACTED]");
    expect(logs[0]?.message).not.toContain("hunter2");
    expect(logs[0]?.level).toBe("error");
  });
});
