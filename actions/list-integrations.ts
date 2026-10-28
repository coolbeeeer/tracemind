import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoIntegrations } from "../shared/tracemind/demo-data.js";
import { integrationSchema } from "../shared/tracemind/schemas.js";

/**
 * Phase 3 demo read: integration connection states, from the labelled
 * demo dataset. No OAuth flow is started here, and no connection is
 * claimed to be active. The backend developer's integration service
 * will replace this data source when OAuth lands.
 */
export default defineAction({
  description:
    "List TraceMind integration connection states. Phase 3 returns labelled demo data only; it does not connect any provider.",
  schema: z.object({}),
  outputSchema: z.object({
    integrations: z.array(integrationSchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async () => {
    return { integrations: demoIntegrations, demo: true };
  },
});
