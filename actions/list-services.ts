import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoServices } from "../shared/tracemind/demo-data.js";
import { serviceSchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 1 demo read: returns the labelled demo service list.
 * No live cloud account is queried. When the backend lands, this
 * action delegates to the real service store; its shape does not change.
 */
export default defineAction({
  description:
    "List TraceMind monitored services with status, provider, error count, and last check time. Phase 1 returns labelled demo data only.",
  schema: z.object({}),
  outputSchema: z.object({
    services: z.array(serviceSchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async () => {
    return { services: demoServices, demo: true };
  },
});
