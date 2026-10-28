import { fetchCloudRunLogs } from "../monitoring/cloud-run-client.js";

/** Server-only permission probe. A successful empty result is still authorized. */
export async function verifyGcpLoggingAccess(input: {
  projectId: string;
  serviceName: string;
  region: string;
  accessToken: string;
  request?: typeof fetch;
}): Promise<{ authorized: true; checkedAt: string }> {
  await fetchCloudRunLogs({
    projectId: input.projectId,
    serviceName: input.serviceName,
    region: input.region,
    since: new Date(Date.now() - 60_000).toISOString(),
    pageSize: 1,
    maxPages: 1,
  }, input.accessToken, input.request);
  return { authorized: true, checkedAt: new Date().toISOString() };
}
