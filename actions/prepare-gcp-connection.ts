import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { createGcpOnboardingPlan } from "../server/tracemind/integrations/gcp-onboarding.js";

/**
 * A read-only onboarding helper, not OAuth and not an active connection.
 * It never receives credentials or modifies Google Cloud resources.
 */
export default defineAction({
  description: "Prepare an administrator-reviewed, keyless Google Cloud Logs Viewer setup plan. Does not connect or grant permissions.",
  schema: z.object({
    projectId: z.string().min(6).max(63),
  }),
  outputSchema: z.object({
    projectId: z.string(),
    serviceAccountEmail: z.string(),
    commands: z.array(z.string()),
    nextSteps: z.array(z.string()),
    connected: z.literal(false),
  }),
  http: { method: "GET" },
  run: async ({ projectId }) => ({
    ...createGcpOnboardingPlan(projectId),
    connected: false as const,
  }),
});
