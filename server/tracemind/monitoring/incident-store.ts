import type { Incident } from "../../../shared/tracemind/models.js";
import type { StoredIncident } from "./reconcile-incidents.js";
import type { LogEntry } from "../../../shared/tracemind/models.js";
import postgres from "postgres";

export interface IncidentFilters {
  severity?: Incident["severity"];
  status?: Incident["status"];
  query?: string;
}

export interface IncidentStore {
  listIncidents(filters?: IncidentFilters): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | null>;
  listOpenRecords(serviceId: string): Promise<StoredIncident[]>;
  upsertRecords(records: readonly StoredIncident[]): Promise<void>;
  listLogs(incidentId: string): Promise<LogEntry[]>;
  updateIncidentStatus(id: string, status: Incident['status']): Promise<Incident | null>;
}

/** PostgreSQL-backed store. Supply DATABASE_URL via server-side secrets only. */
export function createIncidentStore(connectionString: string): IncidentStore & { close(): Promise<void> } {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sql = postgres(connectionString, { max: 5 });
  return {
    async listIncidents(filters = {}) {
      const query = filters.query?.trim().toLowerCase() ?? "";
      const severity = filters.severity ?? null;
      const status = filters.status ?? null;
      const rows = await sql`
        select incident from tracemind_incidents
        where (${severity}::text is null or incident->>'severity' = ${severity})
          and (${status}::text is null or status = ${status})
          and (${query} = '' or lower(
            coalesce(incident->>'id', '') || ' ' ||
            coalesce(incident->>'title', '') || ' ' ||
            coalesce(incident->>'description', '')
          ) like ${'%' + query + '%'})
        order by detected_at desc
      `;
      return rows.map(row => row.incident as Incident);
    },
    async getIncident(id) {
      const rows = await sql`select incident from tracemind_incidents where id = ${id} limit 1`;
      return rows.length ? rows[0].incident as Incident : null;
    },
    async listOpenRecords(serviceId) {
      const rows = await sql`
        select fingerprint, incident, first_seen_at, last_seen_at, occurrence_count
        from tracemind_incidents
        where service_id = ${serviceId} and status <> 'resolved'
      `;
      return rows.map(row => ({
        fingerprint: row.fingerprint as string,
        incident: row.incident as Incident,
        firstSeenAt: new Date(row.first_seen_at as string).toISOString(),
        lastSeenAt: new Date(row.last_seen_at as string).toISOString(),
        occurrenceCount: Number(row.occurrence_count),
      }));
    },
    async upsertRecords(records) {
      if (!records.length) return;
      await sql.begin(async tx => {
        for (const record of records) {
          await tx`
            insert into tracemind_incidents
              (id, service_id, fingerprint, status, detected_at, first_seen_at,
               last_seen_at, occurrence_count, incident)
            values
              (${record.incident.id}, ${record.incident.serviceId}, ${record.fingerprint},
               ${record.incident.status}, ${record.incident.detectedAt},
               ${record.firstSeenAt}, ${record.lastSeenAt},
               ${record.occurrenceCount}, ${tx.json(record.incident)})
            on conflict (id) do update set
              last_seen_at = greatest(tracemind_incidents.last_seen_at, excluded.last_seen_at),
              occurrence_count = greatest(tracemind_incidents.occurrence_count, excluded.occurrence_count)
          `;
        }
      });
    },
    async listLogs(incidentId) {
      const rows = await sql`
        select id, incident_id, service_id, timestamp, level, message, trace_id
        from tracemind_logs where incident_id = ${incidentId}
        order by timestamp desc limit 500
      `;
      return rows.map(row => ({
        id: row.id as string, incidentId: row.incident_id as string,
        serviceId: row.service_id as string,
        timestamp: new Date(row.timestamp as string).toISOString(),
        level: row.level as LogEntry["level"],
        message: row.message as string,
        ...(row.trace_id ? { traceId: row.trace_id as string } : {}),
      }));
    },
    async updateIncidentStatus(id, status) {
      const rows = await sql`
        update tracemind_incidents
        set status = ${status},
            incident = jsonb_set(incident, '{status}', to_jsonb(${status}::text))
        where id = ${id}
        returning incident
      `;
      return rows.length ? rows[0].incident as Incident : null;
    },
    close: () => sql.end(),
  };
}
