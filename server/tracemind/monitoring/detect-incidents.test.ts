import { describe, expect, it } from "vitest";
import { detectIncidents, fingerprintError } from "./detect-incidents.js";

const event = (id: string, minute: number, message = "Database connection failed 123") => ({
  id, serviceId: "wallet", timestamp: new Date(Date.UTC(2026, 9, 29, 0, minute)).toISOString(),
  severity: "ERROR" as const, message, httpStatus: 500,
});

describe("detectIncidents", () => {
  it("normalizes numeric identifiers into a stable fingerprint", () => {
    expect(fingerprintError(event("a", 0, "Failed request 123"))).toBe(fingerprintError(event("b", 0, "Failed request 456")));
  });

  it("does not raise an incident below threshold", () => {
    expect(detectIncidents([event("a", 0), event("b", 1)])).toHaveLength(0);
  });

  it("groups repeated errors into an incident", () => {
    const result = detectIncidents([event("a", 0), event("b", 1), event("c", 2)]);
    expect(result).toHaveLength(1);
    expect(result[0]?.occurrenceCount).toBe(3);
    expect(result[0]?.severity).toBe("critical");
  });

  it("does not merge unrelated services or error signatures", () => {
    const result = detectIncidents([
      event("a", 0), event("b", 1), event("c", 2),
      event("d", 0, "Redis timeout"), event("e", 1, "Redis timeout"), event("f", 2, "Redis timeout"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("ignores expected non-error 4xx events", () => {
    const result = detectIncidents(Array.from({ length: 4 }, (_, i) => ({
      ...event(String(i), i), severity: "INFO" as const, httpStatus: 400,
    })));
    expect(result).toHaveLength(0);
  });
});
