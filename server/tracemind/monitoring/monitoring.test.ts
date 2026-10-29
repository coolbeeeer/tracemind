import { describe, expect, it } from "vitest";
import { detectIncidents, type MonitoringEvent } from "./detect-incidents.js";
import { reconcileIncidents } from "./reconcile-incidents.js";

const error = (id: number, minute: number): MonitoringEvent => ({
  id: String(id),
  serviceId: "payments",
  timestamp: new Date(Date.UTC(2026, 9, 29, 0, minute)).toISOString(),
  severity: "ERROR",
  message: `Database connection failed request ${id}`,
  httpStatus: 500,
});

describe("monitoring incident lifecycle", () => {
  it("emits one candidate for a five-error burst", () => {
    const candidates = detectIncidents(Array.from({ length: 5 }, (_, i) => error(i, i)));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.occurrenceCount).toBe(5);
  });

  it("does not emit a candidate for isolated errors", () => {
    expect(detectIncidents([error(1, 0), error(2, 10), error(3, 20)])).toEqual([]);
  });

  it("does not re-insert incidents from overlapping polls", () => {
    const first = detectIncidents([error(1, 0), error(2, 1), error(3, 2)]);
    const initial = reconcileIncidents(first, [], () => "INC-1");
    expect(initial.inserts).toHaveLength(1);
    const second = detectIncidents([error(1, 0), error(2, 1), error(3, 2), error(4, 3)]);
    const repeated = reconcileIncidents(second, initial.inserts, () => "INC-2");
    expect(repeated.inserts).toHaveLength(0);
    expect(repeated.updates).toHaveLength(1);
    expect(repeated.updates[0]?.incident.id).toBe("INC-1");
    expect(repeated.updates[0]?.lastSeenAt).toBe(error(4, 3).timestamp);
  });

  it("does not update when no new errors have arrived", () => {
    const detected = detectIncidents([error(1, 0), error(2, 1), error(3, 2)]);
    const initial = reconcileIncidents(detected, [], () => "INC-1");
    expect(reconcileIncidents(detected, initial.inserts, () => "unused")).toEqual({
      inserts: [], updates: [],
    });
  });
});
