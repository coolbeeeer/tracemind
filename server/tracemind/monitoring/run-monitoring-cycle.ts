import { randomUUID } from "node:crypto";
import { fetchCloudRunLogs, type CloudRunLogQuery } from "./cloud-run-client.js";
import { detectIncidents } from "./detect-incidents.js";
import { reconcileIncidents } from "./reconcile-incidents.js";
import type { IncidentStore } from "./incident-store.js";

export interface MonitoringRunOptions {
  query: CloudRunLogQuery;
  accessToken: string;
  store: IncidentStore;
  request?: typeof fetch;
}

/**
 * Single-service, read-only collection followed by durable incident writes.
 * Invoke from a trusted scheduler after resolving project authorization.
 *
 * This is not a distributed scheduler. Callers must serialize runs per
 * service and persist polling checkpoints independently.
 */
export async function runMonitoringCycle(options: MonitoringRunOptions) {
  const events = await fetchCloudRunLogs(
    options.query,
    options.accessToken,
    options.request ?? fetch,
  );
  const detected = detectIncidents(events);
  const existing = await options.store.listOpenRecords(options.query.serviceName);
  const changes = reconcileIncidents(
    detected,
    existing,
    () => `INC-${randomUUID()}`,
  );
  await options.store.upsertRecords([...changes.inserts, ...changes.updates]);
  return {
    collectedEvents: events.length,
    detectedGroups: detected.length,
    createdIncidents: changes.inserts.length,
    updatedIncidents: changes.updates.length,
  };
}
