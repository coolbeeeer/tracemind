import { createIncidentStore } from "../server/tracemind/monitoring/incident-store.js";
import { runMonitoringCycle } from "../server/tracemind/monitoring/run-monitoring-cycle.js";
import { getRuntimeGoogleAccessToken } from "../server/tracemind/integrations/google-metadata-token.js";
import { verifyGcpLoggingAccess } from "../server/tracemind/integrations/verify-gcp-access.js";

/**
 * One-shot job for an external scheduler (Cloud Scheduler -> authenticated job).
 * This does not yet provide a durable checkpoint or cross-worker lock.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TRACEMIND_GCP_PROJECT_ID; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential. Backend owner to review at branch integration.
  const serviceName = process.env.TRACEMIND_GCP_SERVICE; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential. Backend owner to review at branch integration.
  const region = process.env.TRACEMIND_GCP_REGION; // guard:allow-env-credential — operator-run one-shot script only; deployment configuration, not a user credential. Backend owner to review at branch integration.
  if (!databaseUrl || !projectId || !serviceName || !region) {
    throw new Error("DATABASE_URL and TRACEMIND_GCP_PROJECT_ID/SERVICE/REGION are required");
  }
  const store = createIncidentStore(databaseUrl);
  try {
    const accessToken = await getRuntimeGoogleAccessToken();
    await verifyGcpLoggingAccess({ projectId, serviceName, region, accessToken });
    const result = await runMonitoringCycle({
      query: {
        projectId, serviceName, region,
        since: new Date(Date.now() - 5 * 60_000).toISOString(),
        maxPages: 4,
      },
      accessToken,
      store,
    });
    console.log(JSON.stringify({ status: "completed", ...result }));
  } finally {
    await store.close();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Monitoring failed");
  process.exitCode = 1;
});
