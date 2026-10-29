import { withMonitoringCheckpoint } from "../server/tracemind/monitoring/poll-checkpoint.js";
import { createIncidentStore } from "../server/tracemind/monitoring/incident-store.js";
import { runMonitoringCycle } from "../server/tracemind/monitoring/run-monitoring-cycle.js";
import { getRuntimeGoogleAccessToken } from "../server/tracemind/integrations/google-metadata-token.js";
import { getUserGoogleAccessToken } from "../server/tracemind/integrations/google-user-token.js";
import { verifyGcpLoggingAccess } from "../server/tracemind/integrations/verify-gcp-access.js";

/**
 * One-shot job for an external scheduler (Cloud Scheduler -> authenticated job).
 * This does not yet provide a durable checkpoint or cross-worker lock.
 *
 * Auth modes (TRACEMIND_AUTH_MODE, default "runtime"):
 * - "runtime": the attached GCP runtime identity (metadata server). Use
 *   for a deployed scheduler. Requires a service account with
 *   roles/logging.viewer, which needs a project IAM administrator.
 * - "user": the operator's own Application Default Credentials
 *   (`gcloud auth application-default print-access-token`). Use for a
 *   demo or self-hosted run in Cloud Shell or on the operator's
 *   machine. No service account and no project IAM change are needed;
 *   it reads only what the operator can already read, and the token
 *   is short-lived and never stored.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TRACEMIND_GCP_PROJECT_ID; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential. Backend owner to review at branch integration.
  const serviceName = process.env.TRACEMIND_GCP_SERVICE; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential. Backend owner to review at branch integration.
  const region = process.env.TRACEMIND_GCP_REGION; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential. Backend owner to review at branch integration.
  const authMode = process.env.TRACEMIND_AUTH_MODE ?? "runtime"; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential.
  if (!databaseUrl || !projectId || !serviceName || !region) {
    throw new Error("DATABASE_URL and TRACEMIND_GCP_PROJECT_ID/SERVICE/REGION are required");
  }
  if (authMode !== "runtime" && authMode !== "user") {
    throw new Error('TRACEMIND_AUTH_MODE must be "runtime" or "user"');
  }
  const store = createIncidentStore(databaseUrl);
  try {
    const accessToken = authMode === "user"
      ? await getUserGoogleAccessToken()
      : await getRuntimeGoogleAccessToken();
    await verifyGcpLoggingAccess({ projectId, serviceName, region, accessToken });
    const outcome = await withMonitoringCheckpoint(
      databaseUrl,
      { projectId, serviceName, region },
      since => runMonitoringCycle({
        query: { projectId, serviceName, region, since, maxPages: 4 },
        accessToken,
        store,
      }),
    );
    console.log(JSON.stringify({ status: outcome.skipped ? "skipped" : "completed", ...outcome.result }));
  } finally {
    await store.close();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Monitoring failed");
  process.exitCode = 1;
});
