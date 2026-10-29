import { fetchCloudRunLogs } from "../server/tracemind/monitoring/cloud-run-client.js";
import { redactMonitoringEvents } from "../server/tracemind/monitoring/redact-events.js";
import { detectIncidents } from "../server/tracemind/monitoring/detect-incidents.js";
import { getRuntimeGoogleAccessToken } from "../server/tracemind/integrations/google-metadata-token.js";
import { getUserGoogleAccessToken } from "../server/tracemind/integrations/google-user-token.js";

/**
 * Read-only historical verification. Runs the existing detector over a
 * past window (default 24 hours) and prints only counts and detected
 * groups. It writes nothing: no database rows, no checkpoint, no
 * incident records. Use it when genuine errors are older than the
 * normal poll's five-minute lookback, instead of moving a checkpoint
 * to force a poll to pass. Operator-run only; never call from a
 * browser action. The full output stays in the operator's own
 * terminal; do not paste raw log payloads to chat or to an assistant.
 */
async function main() {
  const projectId = process.env.TRACEMIND_GCP_PROJECT_ID; // guard:allow-env-credential — operator-run verification only; deployment configuration, not a user credential.
  const serviceName = process.env.TRACEMIND_GCP_SERVICE; // guard:allow-env-credential — operator-run verification only; deployment configuration, not a user credential.
  const region = process.env.TRACEMIND_GCP_REGION; // guard:allow-env-credential — operator-run verification only; deployment configuration, not a user credential.
  const authMode = process.env.TRACEMIND_AUTH_MODE ?? "user"; // guard:allow-env-credential — operator-run verification only; deployment configuration, not a user credential.
  const lookbackHours = Number(process.env.TRACEMIND_LOOKBACK_HOURS ?? "24"); // guard:allow-env-credential — operator-run verification only; deployment configuration, not a user credential.
  if (!projectId || !serviceName || !region) {
    throw new Error("TRACEMIND_GCP_PROJECT_ID/SERVICE/REGION are required");
  }
  if (authMode !== "runtime" && authMode !== "user") {
    throw new Error('TRACEMIND_AUTH_MODE must be "runtime" or "user"');
  }
  if (!Number.isInteger(lookbackHours) || lookbackHours < 1 || lookbackHours > 168) {
    throw new Error("TRACEMIND_LOOKBACK_HOURS must be an integer from 1 to 168");
  }
  const since = new Date(Date.now() - lookbackHours * 60 * 60_000).toISOString();
  const accessToken = authMode === "user"
    ? await getUserGoogleAccessToken()
    : await getRuntimeGoogleAccessToken();
  const rawEvents = await fetchCloudRunLogs({
    projectId, serviceName, region, since, pageSize: 250, maxPages: 20,
  }, accessToken);
  // Exactly the production pipeline: same client (which fails on
  // pagination truncation instead of returning a partial set), same
  // redaction, then the same detector. No separate approximation.
  const events = redactMonitoringEvents(rawEvents);
  const errorEvents = events.filter(e => e.severity === "ERROR" || (e.httpStatus ?? 0) >= 500);
  const incidents = detectIncidents(events);
  console.log(JSON.stringify({
    window: { since, lookbackHours },
    eventsCollected: events.length,
    errorEvents: errorEvents.length,
    incidentsDetected: incidents.length,
    incidents: incidents.map(i => ({
      fingerprint: i.fingerprint.slice(0, 240),
      serviceId: i.serviceId,
      severity: i.severity,
      occurrenceCount: i.occurrenceCount,
      firstSeenAt: i.firstSeenAt,
      lastSeenAt: i.lastSeenAt,
      summary: i.summary.slice(0, 300),
    })),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Historical verification failed");
  process.exitCode = 1;
});
