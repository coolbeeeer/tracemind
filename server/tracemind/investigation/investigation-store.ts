import postgres from "postgres";
import type { Investigation } from "../../../shared/tracemind/models.js";

export function createInvestigationStore(connectionString: string) {
  const sql = postgres(connectionString, { max: 3 });
  return {
    async get(id: string): Promise<Investigation | null> {
      const rows = await sql`select investigation from tracemind_investigations where id = ${id} limit 1`;
      return rows[0] ? rows[0].investigation as Investigation : null;
    },
    async listForIncident(incidentId: string): Promise<Investigation[]> {
      const rows = await sql`
        select investigation from tracemind_investigations
        where incident_id = ${incidentId} order by started_at desc
      `;
      return rows.map(row => row.investigation as Investigation);
    },
    async save(investigation: Investigation): Promise<void> {
      await sql`
        insert into tracemind_investigations (id, incident_id, status, started_at, investigation)
        values (
          ${investigation.id}, ${investigation.incidentId}, ${investigation.status},
          ${investigation.startedAt}, ${sql.json(JSON.parse(JSON.stringify(investigation)))}
        )
        on conflict (id) do update set
          status = excluded.status,
          investigation = excluded.investigation
      `;
    },
    close: () => sql.end(),
  };
}
