import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoInvestigations } from "../shared/tracemind/demo-data.js";
import { investigationSchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 2 demo read: one investigation by id, from the labelled demo
 * dataset. Returns null when the id is unknown. This record is synthetic;
 * it is not agent output, and no investigation is executed here.
 */
export default defineAction({
  description:
    "Get one TraceMind investigation by id. Phase 2 returns labelled demo data only; it does not run an investigation.",
  schema: z.object({
    id: z.string().describe("Investigation id, for example inv-1042"),
  }),
  outputSchema: z.object({
    investigation: investigationSchema.nullable(),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async (args) => {
    return {
      investigation:
        demoInvestigations.find(
          (investigation) => investigation.id === args.id,
        ) ?? null,
      demo: true,
    };
  },
});
