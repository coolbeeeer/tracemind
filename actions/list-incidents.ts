import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { demoIncidents } from "../shared/tracemind/demo-data.js";
import { incidentSchema } from "../shared/tracemind/schemas.js";
import { createIncidentStore } from "../server/tracemind/monitoring/incident-store.js";

/**
 * Phase 1 demo read: returns the labelled demo incident list, optionally
 * filtered by severity or status. No live monitoring data is queried.
 */
export default defineAction({
  description:
    "List TraceMind incidents, optionally filtered by severity or status. Uses PostgreSQL when configured; otherwise returns labelled demo data.",
  schema: z.object({
    severity: z
      .enum(["critical", "warning", "info"])
      .optional()
      .describe('Filter by severity: "critical", "warning", or "info"; omit for all'),
    status: z
      .enum(["open", "investigating", "resolved"])
      .optional()
      .describe('Filter by status: "open", "investigating", or "resolved"; omit for all'),
    query: z
      .string()
      .optional()
      .describe("Free-text search over incident id, title, and description; omit for all"),
  }),
  outputSchema: z.object({
    incidents: z.array(incidentSchema),
    demo: z.boolean(),
  }),
  http: { method: "GET" },
  run: async (args) => {
    const query = args.query?.trim().toLowerCase();
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const store = createIncidentStore(databaseUrl);
      try {
        const incidents = await store.listIncidents({
          ...(args.severity ? { severity: args.severity } : {}),
          ...(args.status ? { status: args.status } : {}),
          ...(args.query ? { query: args.query } : {}),
        });
        return { incidents, demo: false };
      } finally {
        await store.close();
      }
    }
    const incidents = demoIncidents.filter((incident) => {
      if (args.severity && incident.severity !== args.severity) return false;
      if (args.status && incident.status !== args.status) return false;
      if (query) {
        const haystack =
          `${incident.id} ${incident.title} ${incident.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    return { incidents, demo: true };
  },
});
