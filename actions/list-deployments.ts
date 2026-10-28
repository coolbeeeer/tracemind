import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoDeployments } from "../shared/tracemind/demo-data.js";
import { deploymentSchema } from "../shared/tracemind/schemas.js";

/** Phase 1 demo read: recent deployments from the demo dataset. */
export default defineAction({
  description:
    "List recent TraceMind deployments. Phase 1 returns labelled demo data only.",
  schema: z.object({}),
  outputSchema: z.object({
    deployments: z.array(deploymentSchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async () => {
    return { deployments: demoDeployments, demo: true };
  },
});
