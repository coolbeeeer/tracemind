import { defineAction } from "@agent-native/core/action";
import { resolveCredential } from "@agent-native/core/credentials";
import { z } from "zod";
import {
  buildAuthorizationUrl,
  generateOAuthState,
  generatePkceVerifier,
  pkceChallenge,
} from "../server/tracemind/integrations/google-oauth-connection.js";
import { createOAuthTransactionStore } from "../server/tracemind/integrations/oauth-stores.js";

/**
 * Start a Google Cloud connection for the authenticated user.
 * Requires authentication; the caller supplies nothing, so no
 * redirect URI, client credential, or token can be injected from
 * the browser. The redirect URI, client ID, and transaction
 * encryption key are deployment configuration resolved from the
 * framework credential vault (organization scope, set by the
 * TraceMind developer, not by end users). The authorization URL
 * returned contains no secret and no PKCE verifier; the verifier
 * stays server-side, encrypted, in the transaction row.
 */
export function authorizeGoogleConnection(_input: unknown, ctx?: { userEmail?: string | null }): boolean {
  return !!ctx?.userEmail;
}

export default defineAction({
  description:
    "Start a Google Cloud log-read connection for the authenticated user. Returns a Google authorization URL; no credential is accepted from the caller and none is returned.",
  schema: z.object({}),
  outputSchema: z.object({
    authorizationUrl: z.string(),
  }),
  http: { method: "POST" },
  requiresAuth: true,
  authorize: authorizeGoogleConnection,
  run: async (_input, ctx) => {
    if (!ctx?.userEmail) throw new Error("Not authorized");
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Server credentials are required");
    const vaultCtx = {
      userEmail: ctx.userEmail,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    };
    const [clientId, redirectUri, encryptionKeyBase64] = await Promise.all([
      resolveCredential("GOOGLE_CLIENT_ID", vaultCtx),
      resolveCredential("GOOGLE_REDIRECT_URI", vaultCtx),
      resolveCredential("GOOGLE_OAUTH_ENCRYPTION_KEY", vaultCtx),
    ]);
    if (!clientId || !redirectUri || !encryptionKeyBase64) {
      throw new Error("Google connection is not configured for this deployment");
    }
    const encryptionKey = Buffer.from(encryptionKeyBase64, "base64");
    if (encryptionKey.length !== 32) {
      throw new Error("Google connection is not configured for this deployment");
    }
    const state = generateOAuthState();
    const verifier = generatePkceVerifier();
    const store = createOAuthTransactionStore(databaseUrl);
    try {
      await store.create({
        userEmail: ctx.userEmail,
        state,
        codeVerifier: verifier,
        redirectUri,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        encryptionKey,
      });
    } finally {
      await store.close();
    }
    const authorizationUrl = buildAuthorizationUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge: pkceChallenge(verifier),
    });
    return { authorizationUrl: authorizationUrl.toString() };
  },
});
