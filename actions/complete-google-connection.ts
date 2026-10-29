import { defineAction } from "@agent-native/core/action";
import { resolveCredential } from "@agent-native/core/credentials";
import { z } from "zod";
import { handleGoogleCallback } from "../server/tracemind/integrations/google-callback.js";
import { vaultGoogleTokenStore } from "../server/tracemind/integrations/google-token-store.js";
import {
  createGoogleConnectionStore,
  createOAuthTransactionStore,
} from "../server/tracemind/integrations/oauth-stores.js";

/**
 * Complete a Google Cloud connection after Google redirects to the
 * callback page. The callback page sends the one-time state and
 * code through this authenticated action; the action's ctx.userEmail
 * is the trusted identity (framework action authorization), never
 * an email from query parameters, headers, or OAuth state. No
 * token is returned in the output; only a fixed internal redirect
 * destination with a generic result category.
 */
export function authorizeGoogleConnectionCompletion(_input: unknown, ctx?: { userEmail?: string | null }): boolean {
  return !!ctx?.userEmail;
}

export default defineAction({
  description:
    "Complete a Google Cloud log-read connection for the authenticated user from a one-time authorization code. Returns only a fixed internal redirect destination.",
  schema: z.object({
    state: z.string().min(1),
    code: z.string().min(1),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    redirectTo: z.string(),
  }),
  http: { method: "POST" },
  requiresAuth: true,
  authorize: authorizeGoogleConnectionCompletion,
  run: async ({ state, code }, ctx) => {
    if (!ctx?.userEmail) throw new Error("Not authorized");
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Server credentials are required");
    const vaultCtx = {
      userEmail: ctx.userEmail,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    };
    const [clientId, clientSecret, encryptionKeyBase64] = await Promise.all([
      resolveCredential("GOOGLE_CLIENT_ID", vaultCtx),
      resolveCredential("GOOGLE_CLIENT_SECRET", vaultCtx),
      resolveCredential("GOOGLE_OAUTH_ENCRYPTION_KEY", vaultCtx),
    ]);
    if (!clientId || !clientSecret || !encryptionKeyBase64) {
      throw new Error("Google connection is not configured for this deployment");
    }
    const encryptionKey = Buffer.from(encryptionKeyBase64, "base64");
    if (encryptionKey.length !== 32) {
      throw new Error("Google connection is not configured for this deployment");
    }
    const transactions = createOAuthTransactionStore(databaseUrl);
    const connections = createGoogleConnectionStore(databaseUrl);
    try {
      return await handleGoogleCallback({
        state,
        code,
        error: null,
        sessionEmail: ctx.userEmail,
        transactionStore: transactions,
        tokenStore: vaultGoogleTokenStore,
        connectionStore: connections,
        encryptionKey,
        clientId,
        clientSecret,
        ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
      });
    } finally {
      await transactions.close();
      await connections.close();
    }
  },
});
