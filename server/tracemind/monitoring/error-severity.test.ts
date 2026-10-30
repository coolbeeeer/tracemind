import { describe, expect, it } from "vitest";
import { severityOfMessage } from "./error-severity.js";

describe("error severity from message text", () => {
  it("counts explicit error markers as errors", () => {
    expect(severityOfMessage("ERROR: connection refused")).toBe("ERROR");
    expect(severityOfMessage("Fatal exception in handler")).toBe("ERROR");
    expect(severityOfMessage("Traceback (most recent call last)")).toBe("ERROR");
    expect(severityOfMessage("Task timed out after 30 seconds")).toBe("ERROR");
    expect(severityOfMessage("JavaScript heap out of memory")).toBe("ERROR");
  });

  it("counts warnings", () => {
    expect(severityOfMessage("WARN: retrying upstream")).toBe("WARNING");
  });

  it("does not count a bare business failure as an error", () => {
    // "Payment failed" is a business outcome, not an incident signal.
    expect(severityOfMessage("Payment failed for order 42")).toBe("INFO");
    expect(severityOfMessage("User signed in")).toBe("INFO");
  });
});
