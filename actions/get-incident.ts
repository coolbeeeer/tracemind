import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { demoIncidents } from "../shared/tracemind/demo-data.js";
import { incidentSchema } from "../shared/tracemind/schemas.js";
import { createIncidentStore } from "../server/tracemind/monitoring/incident-store.js";

export default defineAction({
  description: "Get a TraceMind incident by ID from PostgreSQL when configured.",
  schema: z.object({ id: z.string() }),
  outputSchema: z.object({ incident: incidentSchema.nullable(), demo: z.boolean() }),
  http: { method: "GET" },
  run: async ({ id }) => {
    if (!process.env.DATABASE_URL) {
      return { incident: demoIncidents.find(item => item.id === id) ?? null, demo: true };
    }
    const store = createIncidentStore(process.env.DATABASE_URL);
    try {
      return { incident: await store.getIncident(id), demo: false };
    } finally {
      await store.close();
    }
  },
});
