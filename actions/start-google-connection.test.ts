import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  vault: new Map<string, string>([
    ["GOOGLE_CLIENT_ID", "client-123"],
    ["GOOGLE_REDIRECT_URI", "https://app.example/auth/google/callback"],
    ["GOOGLE_OAUTH_ENCRYPTION_KEY", Buffer.alloc(32).toString("base64")],
  ]),
}));

vi.mock("../server/tracemind/integrations/oauth-stores.js", () => ({
  createOAuthTransactionStore: () => ({ create: mocks.create, close: mocks.close }),
  createGoogleConnectionStore: () => ({}),
}));
vi.mock("@agent-native/core/credentials", () => ({
  resolveCredential: async (key: string) => mocks.vault.get(key),
  saveCredential: vi.fn(),
  deleteCredential: vi.fn(),
}));

import action, { authorizeGoogleConnection } from "./start-google-connection.js";

describe("start-google-connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://unused";
  });

  it("requires an authenticated user", () => {
    expect(authorizeGoogleConnection({}, {})).toBe(false);
    expect(authorizeGoogleConnection({}, { userEmail: "owner@example.com" } as never)).toBe(true);
  });

  it("creates a transaction and returns an authorization URL without a verifier or secret", async () => {
    const result = await action.run({}, { userEmail: "owner@example.com", caller: "frontend" } as never);
    expect(mocks.create).toHaveBeenCalledOnce();
    const created = mocks.create.mock.calls[0][0] as { userEmail: string; state: string; codeVerifier: string };
    expect(created.userEmail).toBe("owner@example.com");
    expect(created.state).toBeTruthy();
    expect(result.authorizationUrl).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(result.authorizationUrl).toContain("logging.read");
    expect(result.authorizationUrl).not.toContain(created.codeVerifier);
    expect(result.authorizationUrl).not.toContain("client_secret");
  });

  it("fails closed when deployment configuration is missing", async () => {
    mocks.vault.delete("GOOGLE_CLIENT_ID");
    await expect(action.run({}, { userEmail: "owner@example.com", caller: "frontend" } as never))
      .rejects.toThrow(/not configured/);
    mocks.vault.set("GOOGLE_CLIENT_ID", "client-123");
  });
});
