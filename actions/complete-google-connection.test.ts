import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  saveTokens: vi.fn(async () => {}),
  upsert: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  vault: new Map<string, string>([
    ["GOOGLE_CLIENT_ID", "client-123"],
    ["GOOGLE_CLIENT_SECRET", "secret-123"],
    ["GOOGLE_OAUTH_ENCRYPTION_KEY", Buffer.alloc(32).toString("base64")],
  ]),
}));

vi.mock("../server/tracemind/integrations/oauth-stores.js", () => ({
  createOAuthTransactionStore: () => ({ claim: mocks.claim, close: mocks.close }),
  createGoogleConnectionStore: () => ({ upsert: mocks.upsert, close: mocks.close }),
}));
vi.mock("../server/tracemind/integrations/google-token-store.js", () => ({
  vaultGoogleTokenStore: { saveTokens: mocks.saveTokens },
}));
vi.mock("../server/tracemind/integrations/google-oauth-connection.js", async (original) => {
  const actual = await original() as Record<string, unknown>;
  return {
    ...actual,
    exchangeAuthorizationCode: async () => ({
      accessToken: "access-1", refreshToken: "refresh-1",
      expiresInSeconds: 3600, scope: "https://www.googleapis.com/auth/logging.read",
    }),
  };
});
vi.mock("@agent-native/core/credentials", () => ({
  resolveCredential: async (key: string) => mocks.vault.get(key),
  saveCredential: vi.fn(),
  deleteCredential: vi.fn(),
}));

import action, { authorizeGoogleConnectionCompletion } from "./complete-google-connection.js";

describe("complete-google-connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://unused";
    mocks.claim.mockResolvedValue({
      stateHash: "hash", userEmail: "owner@example.com",
      codeVerifier: "verifier-1", redirectUri: "https://app.example/auth/google/callback",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    });
  });

  it("requires an authenticated user", () => {
    expect(authorizeGoogleConnectionCompletion({}, {})).toBe(false);
    expect(authorizeGoogleConnectionCompletion({}, { userEmail: "owner@example.com" } as never)).toBe(true);
  });

  it("completes for the transaction owner and returns only a fixed redirect", async () => {
    const result = await action.run(
      { state: "state-1", code: "code-1" },
      { userEmail: "owner@example.com", caller: "frontend" } as never,
    );
    expect(result).toEqual({ ok: true, redirectTo: "/integrations?google=connected" });
    expect(mocks.saveTokens).toHaveBeenCalledOnce();
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });

  it("rejects a different authenticated account without saving tokens", async () => {
    const result = await action.run(
      { state: "state-1", code: "code-1" },
      { userEmail: "other@example.com", caller: "frontend" } as never,
    );
    expect(result.ok).toBe(false);
    expect(mocks.saveTokens).not.toHaveBeenCalled();
  });
});
