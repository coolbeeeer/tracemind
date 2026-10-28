import { strict as assert } from "node:assert";
import { test } from "node:test";
import { detectIncidents, fingerprintError } from "./detect-incidents.js";

const event = (id: string, minute: number, message = "Database connection failed 123") => ({
  id, serviceId: "wallet", timestamp: new Date(Date.UTC(2026, 9, 29, 0, minute)).toISOString(),
  severity: "ERROR" as const, message, httpStatus: 500,
});

test("normalizes numeric identifiers into a stable fingerprint", () => {
  assert.equal(fingerprintError(event("a", 0, "Failed request 123")), fingerprintError(event("b", 0, "Failed request 456")));
});

test("does not raise an incident below threshold", () => {
  assert.equal(detectIncidents([event("a", 0), event("b", 1)]).length, 0);
});

test("groups repeated errors into an incident", () => {
  const result = detectIncidents([event("a", 0), event("b", 1), event("c", 2)]);
  assert.equal(result.length, 1);
  assert.equal(result[0].occurrenceCount, 3);
  assert.equal(result[0].severity, "critical");
});

test("does not merge unrelated services or error signatures", () => {
  const result = detectIncidents([
    event("a", 0), event("b", 1), event("c", 2),
    event("d", 0, "Redis timeout"), event("e", 1, "Redis timeout"), event("f", 2, "Redis timeout"),
  ]);
  assert.equal(result.length, 2);
});

test("ignores expected non-error 4xx events", () => {
  const result = detectIncidents(Array.from({ length: 4 }, (_, i) => ({
    ...event(String(i), i), severity: "INFO" as const, httpStatus: 400,
  })));
  assert.equal(result.length, 0);
});
