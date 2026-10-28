import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoInvestigations } from "../shared/tracemind/demo-data.js";
import { investigationSchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 1 demo read: investigations in the demo dataset.
 * These are synthetic records, not agent output. A real investigation
 * action is Phase 5 and is deliberately not implemented here.
 */
export default defineAction({
  description:
    "List TraceMind investigations with steps, hypotheses, and fixes. Phase 1 returns labelled demo data only; it does not run an investigation.",
  schema: z.object({}),
  outputSchema: z.object({
    investigations: z.array(investigationSchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async () => {
    return { investigations: demoInvestigations, demo: true };
  },
});
