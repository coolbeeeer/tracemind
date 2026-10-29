import { deleteCredential, resolveCredential, saveCredential } from "@agent-native/core/credentials";

/**
 * Google OAuth tokens in the framework credential vault, user scope.
 * Keys are per-user vault entries, never database rows, never browser
 * values, and never action outputs. The vault stores strings only;
 * expiry is stored as an ISO-8601 string alongside the access token
 * so refresh logic can compare it without a separate store.
 */
export interface GoogleTokenStore {
  saveTokens(input: {
    userEmail: string;
    orgId?: string | null;
    refreshToken: string;
    accessToken: string;
    accessTokenExpiresAt: string;
  }): Promise<void>;
  getTokens(input: { userEmail: string; orgId?: string | null }): Promise<{
    refreshToken: string;
    accessToken: string;
    accessTokenExpiresAt: string;
  } | null>;
  deleteTokens(input: { userEmail: string; orgId?: string | null }): Promise<void>;
}

const REFRESH_KEY = "GOOGLE_REFRESH_TOKEN";
const ACCESS_KEY = "GOOGLE_ACCESS_TOKEN";
const EXPIRY_KEY = "GOOGLE_ACCESS_TOKEN_EXPIRES_AT";

export const vaultGoogleTokenStore: GoogleTokenStore = {
  async saveTokens(input) {
    const ctx = { userEmail: input.userEmail, ...(input.orgId ? { orgId: input.orgId } : {}) };
    await saveCredential(REFRESH_KEY, input.refreshToken, ctx);
    await saveCredential(ACCESS_KEY, input.accessToken, ctx);
    await saveCredential(EXPIRY_KEY, input.accessTokenExpiresAt, ctx);
  },
  async getTokens(input) {
    const ctx = { userEmail: input.userEmail, ...(input.orgId ? { orgId: input.orgId } : {}) };
    const [refreshToken, accessToken, accessTokenExpiresAt] = await Promise.all([
      resolveCredential(REFRESH_KEY, ctx),
      resolveCredential(ACCESS_KEY, ctx),
      resolveCredential(EXPIRY_KEY, ctx),
    ]);
    if (!refreshToken || !accessToken || !accessTokenExpiresAt) return null;
    return { refreshToken, accessToken, accessTokenExpiresAt };
  },
  async deleteTokens(input) {
    const ctx = { userEmail: input.userEmail, ...(input.orgId ? { orgId: input.orgId } : {}) };
    await Promise.all([
      deleteCredential(REFRESH_KEY, ctx),
      deleteCredential(ACCESS_KEY, ctx),
      deleteCredential(EXPIRY_KEY, ctx),
    ]);
  },
};
