import { createHash, randomBytes } from "node:crypto";

/**
 * Server-only Google Cloud OAuth connection primitives for the
 * logging.read scope. This module implements the flow, not the
 * product: it never renders a button, never stores a token in the
 * browser, and never accepts a credential from a browser action.
 *
 * What is deliberately NOT in this module, because it is not yet
 * verified: the HTTP callback route. The scaffold's server/routes/
 * currently contains only the SSR handler; backend contracts say
 * OAuth callbacks live under server/routes/api/ only when the
 * backend implements them, and that directory does not exist yet.
 * Wiring a callback file on an assumed Nitro registration rule
 * would be a fake connection. The callback must be added only
 * after its route registration is verified against the deployed
 * app, with an exact registered HTTPS redirect URI.
 *
 * Token storage: refresh tokens are stored through the framework
 * credential vault (user scope), never in the database, browser,
 * logs, or action outputs. The vault stores strings only, so
 * expiry and refresh are implemented here, not assumed from it.
 */

export const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_LOGGING_READ_SCOPE = "https://www.googleapis.com/auth/logging.read";

export function generatePkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function buildAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): URL {
  if (!input.clientId || !input.redirectUri || !input.state || !input.codeChallenge) {
    throw new Error("Google OAuth authorization requires clientId, redirectUri, state, and codeChallenge");
  }
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", GOOGLE_LOGGING_READ_SCOPE);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  scope: string;
}

type TokenRequest = typeof fetch;

async function postToken(body: Record<string, string>, request: TokenRequest): Promise<GoogleTokens> {
  const response = await request(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!response.ok) throw new Error(`Google token exchange failed (HTTP ${response.status})`);
  const data = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!data.access_token || !Number.isFinite(data.expires_in)) {
    throw new Error("Google token response was missing an access token or expiry");
  }
  return {
    accessToken: data.access_token,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    expiresInSeconds: data.expires_in as number,
    scope: data.scope ?? "",
  };
}

function assertLoggingScope(scope: string): void {
  if (!scope.split(" ").includes(GOOGLE_LOGGING_READ_SCOPE)) {
    throw new Error("Google granted scope does not include logging.read");
  }
}

/** Exchange an authorization code. A missing refresh token is an error, not a silent access-only connection. */
export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  request?: TokenRequest;
}): Promise<GoogleTokens> {
  if (!input.code || !input.codeVerifier || !input.clientId || !input.clientSecret || !input.redirectUri) {
    throw new Error("Google code exchange requires code, verifier, client credentials, and redirectUri");
  }
  const tokens = await postToken({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  }, input.request ?? fetch);
  assertLoggingScope(tokens.scope);
  if (!tokens.refreshToken) {
    throw new Error("Google did not return a refresh token; re-consent with prompt=consent is required for background monitoring");
  }
  return tokens;
}

export async function refreshGoogleAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  request?: TokenRequest;
}): Promise<GoogleTokens> {
  if (!input.refreshToken || !input.clientId || !input.clientSecret) {
    throw new Error("Google token refresh requires a refresh token and client credentials");
  }
  const tokens = await postToken({
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
  }, input.request ?? fetch);
  assertLoggingScope(tokens.scope);
  return tokens;
}

export interface StoredGoogleTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO-8601 UTC time at which the access token expires. */
  accessTokenExpiresAt: string;
}

/**
 * Return a usable access token, refreshing it when it is expired or
 * within 60 seconds of expiry. Returns the tokens the caller must
 * persist (a rotated refresh token, when Google returns one, replaces
 * the old one). Pure with respect to storage: the caller owns
 * persistence through the vault, so tests can inject a store.
 */
export async function getValidGoogleAccessToken(input: {
  stored: StoredGoogleTokens;
  clientId: string;
  clientSecret: string;
  request?: TokenRequest;
  now?: Date;
}): Promise<{ accessToken: string; stored: StoredGoogleTokens }> {
  const nowMs = (input.now ?? new Date()).getTime();
  const expiresMs = Date.parse(input.stored.accessTokenExpiresAt);
  if (Number.isFinite(expiresMs) && expiresMs - nowMs > 60_000) {
    return { accessToken: input.stored.accessToken, stored: input.stored };
  }
  const refreshed = await refreshGoogleAccessToken({
    refreshToken: input.stored.refreshToken,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    ...(input.request ? { request: input.request } : {}),
  });
  const stored: StoredGoogleTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? input.stored.refreshToken,
    accessTokenExpiresAt: new Date(nowMs + refreshed.expiresInSeconds * 1000).toISOString(),
  };
  return { accessToken: stored.accessToken, stored };
}
