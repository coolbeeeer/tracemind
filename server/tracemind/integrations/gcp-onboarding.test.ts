import { describe, expect, it } from "vitest";
import { createGcpOnboardingPlan } from "./gcp-onboarding.js";

describe("Google Cloud connection onboarding", () => {
  it("prepares keyless, read-only project setup", () => {
    const plan = createGcpOnboardingPlan("elantra-gameolive");
    expect(plan.serviceAccountEmail).toBe("tracemind-monitor@elantra-gameolive.iam.gserviceaccount.com");
    expect(plan.commands.join(" ")).toContain("roles/logging.viewer");
    expect(plan.commands.join(" ")).not.toContain("keys create");
  });
  it("rejects shell injection and invalid identifiers", () => {
    expect(() => createGcpOnboardingPlan("foo; echo bad")).toThrow();
    expect(() => createGcpOnboardingPlan("valid-project", "bad \" name")).toThrow();
  });
});
