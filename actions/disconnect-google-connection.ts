import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { vaultGoogleTokenStore } from "../server/tracemind/integrations/google-token-store.js";
import { createGoogleConnectionStore } from "../server/tracemind/integrations/oauth-stores.js";

/**
 * Disconnect the authenticated user's Google Cloud connection.
 * Revocation is best-effort: the token is revoked at Google when
 * one is present, but disconnect succeeds even if revocation
 * fails, because deleting the vault tokens and the connection
 * record is what guarantees no future poll can use the account.
 * No OAuth-connected poll path exists yet, so there is no
 * running worker to cancel; a future poll worker must check the
 * connection record and vault tokens before every run and must
 * never fall back to a deleted connection.
 */
export function authorizeGoogleDisconnection(_input: unknown, ctx?: { userEmail?: string | null }): boolean {
  return !!ctx?.userEmail;
}

async function revokeGoogleToken(refreshToken: string, request: typeof fetch): Promise<void> {
  try {
    const response = await request("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(refreshToken)}`,
    });
    if (!response.ok) {
      // Sanitized status only. Never log the token or the response body.
      console.warn(`Google token revocation failed with HTTP status ${response.status}`);
    }
  } catch {
    // Best-effort only; deletion below is the guarantee.
    console.warn("Google token revocation request failed");
  }
}

export default defineAction({
  description:
    "Disconnect the authenticated user's Google Cloud connection. Revokes the refresh token at Google when present, then deletes vault tokens and connection metadata.",
  schema: z.object({}),
  outputSchema: z.object({
    disconnected: z.boolean(),
  }),
  http: { method: "POST" },
  requiresAuth: true,
  authorize: authorizeGoogleDisconnection,
  run: async (_input, ctx) => {
    if (!ctx?.userEmail) throw new Error("Not authorized");
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Server credentials are required");
    const vaultCtx = {
      userEmail: ctx.userEmail,
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    };
    const tokens = await vaultGoogleTokenStore.getTokens(vaultCtx);
    if (tokens?.refreshToken) {
      await revokeGoogleToken(tokens.refreshToken, fetch);
    }
    await vaultGoogleTokenStore.deleteTokens(vaultCtx);
    const connections = createGoogleConnectionStore(databaseUrl);
    try {
      await connections.delete(ctx.userEmail);
    } finally {
      await connections.close();
    }
    return { disconnected: true };
  },
});
