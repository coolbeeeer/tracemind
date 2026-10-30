import { randomUUID } from "node:crypto";
import { redactMonitoringEvents } from "./redact-events.js";
import {
  fetchCloudWatchLogs,
  type AwsCredentials,
  type CloudWatchLogQuery,
} from "./cloudwatch-client.js";
import { detectIncidents, fingerprintError } from "./detect-incidents.js";
import { reconcileIncidents } from "./reconcile-incidents.js";
import type { IncidentStore } from "./incident-store.js";
import type { LogEntry } from "../../../shared/tracemind/models.js";

export interface AwsMonitoringRunOptions {
  query: CloudWatchLogQuery;
  credentials: AwsCredentials;
  store: IncidentStore;
  request?: typeof fetch;
}

/**
 * AWS mirror of runMonitoringCycle: single log group, read-only
 * collection followed by durable incident writes. Invoke from a trusted
 * scheduler after resolving the caller's AWS authorization from the
 * server-side vault. Callers must serialize runs per log group and
 * persist polling checkpoints independently. CloudWatch carries no HTTP
 * status, so error bursts classify as warning, not critical; the
 * incident is still created, which is the point of the read.
 */
export async function runAwsMonitoringCycle(options: AwsMonitoringRunOptions) {
  const rawEvents = await fetchCloudWatchLogs(
    options.query,
    options.credentials,
    options.request ?? fetch,
  );
  const events = redactMonitoringEvents(rawEvents);
  const detected = detectIncidents(events);
  const existing = await options.store.listOpenRecords(options.query.logGroupName);
  const changes = reconcileIncidents(
    detected,
    existing,
    () => `INC-${randomUUID()}`,
  );
  await options.store.upsertRecords([...changes.inserts, ...changes.updates]);
  const incidentByFingerprint = new Map(
    [...existing, ...changes.inserts, ...changes.updates].map(record => [
      record.fingerprint,
      record.incident.id,
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
      id: `${options.query.region}:${options.query.logGroupName}:${event.id}`,
      incidentId,
      serviceId: event.serviceId,
      timestamp: event.timestamp,
      level: event.severity === "ERROR" ? "error" : event.severity === "WARNING" ? "warn" : "info",
      message,
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
