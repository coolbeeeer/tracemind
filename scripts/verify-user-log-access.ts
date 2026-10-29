import { getUserGoogleAccessToken } from "../server/tracemind/integrations/google-user-token.js";
import { verifyGcpLoggingAccess } from "../server/tracemind/integrations/verify-gcp-access.js";

/**
 * Operator-run probe only: proves the current Google login can read
 * Cloud Run logs for one service, without writing to any database and
 * without changing any IAM policy. Run it in Cloud Shell (or on the
 * operator's machine) before attempting a user-auth poll. It prints
 * only the authorization result and a timestamp, never a token.
 */
async function main() {
  const projectId = process.env.TRACEMIND_GCP_PROJECT_ID; // guard:allow-env-credential — operator-run probe only; deployment configuration, not a user credential.
  const serviceName = process.env.TRACEMIND_GCP_SERVICE; // guard:allow-env-credential — operator-run probe only; deployment configuration, not a user credential.
  const region = process.env.TRACEMIND_GCP_REGION; // guard:allow-env-credential — operator-run probe only; deployment configuration, not a user credential.
  if (!projectId || !serviceName || !region) {
    throw new Error("TRACEMIND_GCP_PROJECT_ID/SERVICE/REGION are required");
  }
  const accessToken = await getUserGoogleAccessToken();
  const result = await verifyGcpLoggingAccess({ projectId, serviceName, region, accessToken });
  console.log(JSON.stringify({ authorized: result.authorized, checkedAt: result.checkedAt, projectId, serviceName, region }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Log access check failed");
  process.exitCode = 1;
});
