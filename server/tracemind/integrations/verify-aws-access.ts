import {
  fetchCloudWatchLogs,
  type AwsCredentials,
} from "../monitoring/cloudwatch-client.js";

/** Server-only permission probe. A successful empty result is still authorized. */
export async function verifyAwsLoggingAccess(input: {
  region: string;
  logGroupName: string;
  credentials: AwsCredentials;
  request?: typeof fetch;
}): Promise<{ authorized: true; checkedAt: string }> {
  await fetchCloudWatchLogs(
    {
      region: input.region,
      logGroupName: input.logGroupName,
      since: new Date(Date.now() - 60_000).toISOString(),
      pageSize: 1,
      maxPages: 1,
    },
    input.credentials,
    input.request,
  );
  return { authorized: true, checkedAt: new Date().toISOString() };
}
