import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoIncidents } from "../shared/tracemind/demo-data.js";
import { incidentSchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 2 demo read: one incident by id, from the labelled demo dataset.
 * Returns null when the id is unknown, so the detail page can show a
 * real "not found" state instead of fabricating an incident. The future
 * backend action keeps this shape; only the data source changes.
 */
export default defineAction({
  description:
    "Get one TraceMind incident by id. Phase 2 returns labelled demo data only.",
  schema: z.object({
    id: z.string().describe("Incident id, for example INC-1042"),
  }),
  outputSchema: z.object({
    incident: incidentSchema.nullable(),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async (args) => {
    return {
      incident: demoIncidents.find((incident) => incident.id === args.id) ?? null,
      demo: true,
    };
  },
});
