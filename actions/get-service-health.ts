import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoHealth } from "../shared/tracemind/demo-data.js";
import { serviceHealthSchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 1 demo read: health points for one service, from the demo dataset.
 */
export default defineAction({
  description:
    "Get health points (error rate, request count, p95 latency) for one TraceMind service. Phase 1 returns labelled demo data only.",
  schema: z.object({
    serviceId: z.string().describe("Service id, for example svc-payments-api"),
  }),
  outputSchema: z.object({
    health: z.array(serviceHealthSchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async (args) => {
    return {
      health: demoHealth.filter((point) => point.serviceId === args.serviceId),
      demo: true,
    };
  },
});
