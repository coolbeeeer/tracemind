import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getTokens: vi.fn(async () => ({ refreshToken: "refresh-1", accessToken: "access-1", accessTokenExpiresAt: "2099-01-01T00:00:00Z" })),
  deleteTokens: vi.fn(async () => {}),
  deleteConnection: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  revokeStatus: 200,
}));

vi.mock("../server/tracemind/integrations/google-token-store.js", () => ({
  vaultGoogleTokenStore: { getTokens: mocks.getTokens, deleteTokens: mocks.deleteTokens },
}));
vi.mock("../server/tracemind/integrations/oauth-stores.js", () => ({
  createGoogleConnectionStore: () => ({ delete: mocks.deleteConnection, close: mocks.close }),
  createOAuthTransactionStore: () => ({}),
}));

import action, { authorizeGoogleDisconnection } from "./disconnect-google-connection.js";

describe("disconnect-google-connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://unused";
    mocks.revokeStatus = 200;
    vi.stubGlobal("fetch", async () => new Response(null, { status: mocks.revokeStatus }));
  });

  it("requires an authenticated user", () => {
    expect(authorizeGoogleDisconnection({}, {})).toBe(false);
    expect(authorizeGoogleDisconnection({}, { userEmail: "owner@example.com" } as never)).toBe(true);
  });

  it("revokes, deletes vault tokens, and deletes metadata", async () => {
    const result = await action.run({}, { userEmail: "owner@example.com", caller: "frontend" } as never);
    expect(result).toEqual({ disconnected: true });
    expect(mocks.deleteTokens).toHaveBeenCalledOnce();
    expect(mocks.deleteConnection).toHaveBeenCalledWith("owner@example.com");
  });

  it("still disconnects when revocation fails", async () => {
    mocks.revokeStatus = 400;
    const result = await action.run({}, { userEmail: "owner@example.com", caller: "frontend" } as never);
    expect(result).toEqual({ disconnected: true });
    expect(mocks.deleteTokens).toHaveBeenCalledOnce();
    expect(mocks.deleteConnection).toHaveBeenCalledOnce();
  });

  it("disconnects cleanly when no tokens are stored", async () => {
    mocks.getTokens.mockResolvedValueOnce(null);
    const result = await action.run({}, { userEmail: "owner@example.com", caller: "frontend" } as never);
    expect(result).toEqual({ disconnected: true });
    expect(mocks.deleteConnection).toHaveBeenCalledOnce();
  });
});
