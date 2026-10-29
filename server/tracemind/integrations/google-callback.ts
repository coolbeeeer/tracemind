import { GOOGLE_LOGGING_READ_SCOPE, exchangeAuthorizationCode } from "./google-oauth-connection.js";
import type { GoogleConnectionStore } from "./oauth-stores.js";
import type { OAuthTransactionStore } from "./oauth-stores.js";
import type { GoogleTokenStore } from "./google-token-store.js";

/**
 * Server-side Google OAuth callback logic. This function does NOT
 * resolve the authenticated session itself: the caller (a React
 * Router server loader, once its session resolution is verified)
 * must supply the authenticated session email. Supplying any other
 * email, or a missing email, is a rejection, never a fallback.
 * Redirect destinations are fixed internal paths with a generic
 * result category only; no codes, tokens, or provider error details
 * ever appear in a redirect URL.
 */
export type GoogleCallbackOutcome =
  | { ok: true; redirectTo: "/integrations?google=connected" }
  | { ok: false; redirectTo: "/integrations?google=denied" | "/integrations?google=failed" };

export async function handleGoogleCallback(input: {
  state: string | null;
  code: string | null;
  error: string | null;
  /** Authenticated TraceMind session email, supplied by the verified caller. Null means no session. */
  sessionEmail: string | null;
  transactionStore: OAuthTransactionStore;
  tokenStore: GoogleTokenStore;
  connectionStore: GoogleConnectionStore;
  encryptionKey: Buffer;
  clientId: string;
  clientSecret: string;
  orgId?: string | null;
  request?: typeof fetch;
  now?: Date;
}): Promise<GoogleCallbackOutcome> {
  const failed: GoogleCallbackOutcome = { ok: false, redirectTo: "/integrations?google=failed" };
  const denied: GoogleCallbackOutcome = { ok: false, redirectTo: "/integrations?google=denied" };
  if (!input.sessionEmail || !input.state) return failed;
  const transaction = await input.transactionStore.claim(input.state, input.encryptionKey, input.now);
  if (!transaction) return failed;
  if (transaction.userEmail !== input.sessionEmail) return failed;
  if (input.error) return denied;
  if (!input.code) return failed;
  let tokens;
  try {
    tokens = await exchangeAuthorizationCode({
      code: input.code,
      codeVerifier: transaction.codeVerifier,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      redirectUri: transaction.redirectUri,
      ...(input.request ? { request: input.request } : {}),
    });
  } catch {
    // Exchange failures are reported generically; provider details are never placed in a redirect URL.
    await input.connectionStore.upsert({
      userEmail: input.sessionEmail,
      status: "permission-denied",
      googleAccountEmail: null,
      scopes: "",
      projectId: null,
      serviceName: null,
      region: null,
      connectedAt: null,
    });
    return failed;
  }
  if (!tokens.refreshToken) return failed;
  const nowMs = (input.now ?? new Date()).getTime();
  const expiresAt = new Date(nowMs + tokens.expiresInSeconds * 1000).toISOString();
  await input.tokenStore.saveTokens({
    userEmail: input.sessionEmail,
    ...(input.orgId ? { orgId: input.orgId } : {}),
    refreshToken: tokens.refreshToken,
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: expiresAt,
  });
  await input.connectionStore.upsert({
    userEmail: input.sessionEmail,
    status: "connected",
    googleAccountEmail: null,
    scopes: GOOGLE_LOGGING_READ_SCOPE,
    projectId: null,
    serviceName: null,
    region: null,
    connectedAt: new Date(nowMs).toISOString(),
  });
  return { ok: true, redirectTo: "/integrations?google=connected" };
}
