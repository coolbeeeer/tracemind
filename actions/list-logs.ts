import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoLogs } from "../shared/tracemind/demo-data.js";
import { logEntrySchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 2 demo read: log entries for one incident, from the labelled
 * demo dataset. No live Cloud Logging account is queried.
 */
export default defineAction({
  description:
    "List TraceMind log entries for one incident. Phase 2 returns labelled demo data only.",
  schema: z.object({
    incidentId: z.string().describe("Incident id, for example INC-1042"),
  }),
  outputSchema: z.object({
    logs: z.array(logEntrySchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async (args) => {
    return {
      logs: demoLogs.filter((log) => log.incidentId === args.incidentId),
      demo: true,
    };
  },
});
