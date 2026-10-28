import { randomUUID } from "node:crypto";
import { fetchCloudRunLogs, type CloudRunLogQuery } from "./cloud-run-client.js";
import { detectIncidents, fingerprintError } from "./detect-incidents.js";
import { reconcileIncidents } from "./reconcile-incidents.js";
import type { IncidentStore } from "./incident-store.js";
import type { LogEntry } from "../../../shared/tracemind/models.js";

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
  const incidentByFingerprint = new Map(
    [...existing, ...changes.inserts, ...changes.updates].map(record => [
      record.fingerprint, record.incident.id,
    ]),
  );
  const logs: LogEntry[] = [];
  for (const event of events) {
    // Never store full raw payloads without a dedicated redaction policy.
    const incidentId = incidentByFingerprint.get(fingerprintError(event));
    if (!incidentId) continue;
    const message = event.message
      .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]")
      .replace(/(password|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
      .slice(0, 2000);
    logs.push({
      id: `${options.query.projectId}:${options.query.serviceName}:${event.id}`,
      incidentId,
      serviceId: event.serviceId,
      timestamp: event.timestamp,
      level: event.severity === "ERROR" ? "error" : event.severity === "WARNING" ? "warn" : "info",
      message,
      ...(event.traceId ? { traceId: event.traceId } : {}),
    });
  }
  await options.store.upsertLogs(logs);
  return {
    collectedEvents: events.length,
    detectedGroups: detected.length,
    createdIncidents: changes.inserts.length,
    updatedIncidents: changes.updates.length,
    storedLogs: logs.length,
  };
}
