import { describe, expect, it } from "vitest";
import { normalizeCloudWatchLog } from "./cloudwatch-normalizer.js";

const base = { timestamp: Date.UTC(2026, 9, 30, 12, 0, 0) };

describe("CloudWatch normalizer", () => {
  it("maps an error event with its id and service", () => {
    const event = normalizeCloudWatchLog(
      { eventId: "evt-1", message: "ERROR: disk full on worker", ...base },
      "/aws/lambda/payments",
    );
    expect(event?.serviceId).toBe("/aws/lambda/payments");
    expect(event?.severity).toBe("ERROR");
    expect(event?.id).toBe("evt-1");
    expect(event?.httpStatus).toBeUndefined();
  });

  it("falls back to a derived id without an event id", () => {
    const event = normalizeCloudWatchLog({ message: "INFO: started", ...base }, "api");
    expect(event?.id).toContain("api:");
  });

  it("drops empty messages and unusable timestamps", () => {
    expect(normalizeCloudWatchLog({ message: "", ...base }, "api")).toBeNull();
    expect(
      normalizeCloudWatchLog({ message: "ERROR: boom" }, "api"),
    ).toBeNull();
  });
});
