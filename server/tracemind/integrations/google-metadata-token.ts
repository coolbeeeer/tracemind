/**
 * Fetch a short-lived access token from the attached GCP runtime identity.
 * Never accept an access token from a browser action argument.
 * Only use on a trusted Google Cloud runtime with a metadata server.
 */
export async function getRuntimeGoogleAccessToken(request: typeof fetch = fetch): Promise<string> {
  const response = await request(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw new Error(`Google runtime identity unavailable (HTTP ${response.status})`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google runtime identity did not return an access token");
  return data.access_token;
}
