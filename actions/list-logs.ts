import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { demoLogs } from "../shared/tracemind/demo-data.js";
import { logEntrySchema } from "../shared/tracemind/schemas.js";
import { createIncidentStore } from "../server/tracemind/monitoring/incident-store.js";

export default defineAction({
  description: "List up to 500 most recent stored logs for an incident.",
  schema: z.object({ incidentId: z.string() }),
  outputSchema: z.object({ logs: z.array(logEntrySchema), demo: z.boolean() }),
  http: { method: "GET" },
  run: async ({ incidentId }) => {
    if (!process.env.DATABASE_URL) {
      return { logs: demoLogs.filter(log => log.incidentId === incidentId), demo: true };
    }
    const store = createIncidentStore(process.env.DATABASE_URL);
    try {
      return { logs: await store.listLogs(incidentId), demo: false };
    } finally {
      await store.close();
    }
  },
});
