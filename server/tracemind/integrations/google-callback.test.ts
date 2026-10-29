import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { handleGoogleCallback } from "./google-callback.js";
import { decryptVerifier, encryptVerifier } from "./verifier-crypto.js";
import { GOOGLE_LOGGING_READ_SCOPE } from "./google-oauth-connection.js";

const KEY = randomBytes(32);

function fakeStores(overrides: { claim?: unknown; userEmail?: string } = {}) {
  const savedTokens: Record<string, string> = {};
  const savedConnections: unknown[] = [];
  return {
    savedTokens,
    savedConnections,
    transactionStore: {
      create: vi.fn(),
      claim: vi.fn(async () => ("claim" in overrides ? overrides.claim : {
        stateHash: "hash", userEmail: overrides.userEmail ?? "owner@example.com",
        codeVerifier: "verifier-1", redirectUri: "https://app.example/callback",
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      })),
    },
    tokenStore: {
      saveTokens: vi.fn(async (input: { refreshToken: string; accessToken: string }) => {
        savedTokens.refresh = input.refreshToken;
        savedTokens.access = input.accessToken;
      }),
      getTokens: vi.fn(async () => null),
      deleteTokens: vi.fn(),
    },
    connectionStore: {
      upsert: vi.fn(async (c: unknown) => { savedConnections.push(c); }),
      get: vi.fn(async () => null),
      delete: vi.fn(),
    },
  };
}

function tokenRequest() {
  return async () => new Response(JSON.stringify({
    access_token: "access-1", refresh_token: "refresh-1",
    expires_in: 3600, scope: GOOGLE_LOGGING_READ_SCOPE,
  }), { headers: { "Content-Type": "application/json" } });
}

describe("verifier encryption", () => {
  it("round-trips and rejects a wrong key", () => {
    const encrypted = encryptVerifier("verifier-secret", KEY);
    expect(encrypted).not.toContain("verifier-secret");
    expect(decryptVerifier(encrypted, KEY)).toBe("verifier-secret");
    expect(() => decryptVerifier(encrypted, randomBytes(32))).toThrow();
  });
});

describe("Google callback logic", () => {
  it("succeeds, saves tokens and metadata, and redirects without any token in the URL", async () => {
    const stores = fakeStores();
    const outcome = await handleGoogleCallback({
      state: "state-1", code: "code-1", error: null, sessionEmail: "owner@example.com",
      transactionStore: stores.transactionStore as never,
      tokenStore: stores.tokenStore as never,
      connectionStore: stores.connectionStore as never,
      encryptionKey: KEY, clientId: "c", clientSecret: "s",
      request: tokenRequest() as typeof fetch,
    });
    expect(outcome).toEqual({ ok: true, redirectTo: "/integrations?google=connected" });
    expect(outcome.redirectTo).not.toContain("access");
    expect(outcome.redirectTo).not.toContain("refresh");
    expect(stores.savedTokens.refresh).toBe("refresh-1");
    expect(stores.savedConnections).toHaveLength(1);
    expect((stores.savedConnections[0] as { status: string }).status).toBe("connected");
  });

  it("rejects a session that does not match the transaction owner", async () => {
    const stores = fakeStores();
    const outcome = await handleGoogleCallback({
      state: "state-1", code: "code-1", error: null, sessionEmail: "other@example.com",
      transactionStore: stores.transactionStore as never,
      tokenStore: stores.tokenStore as never,
      connectionStore: stores.connectionStore as never,
      encryptionKey: KEY, clientId: "c", clientSecret: "s",
      request: tokenRequest() as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    expect(stores.savedTokens.refresh).toBeUndefined();
  });

  it("rejects missing, expired, or already-consumed state", async () => {
    const stores = fakeStores({ claim: null });
    const outcome = await handleGoogleCallback({
      state: "state-1", code: "code-1", error: null, sessionEmail: "owner@example.com",
      transactionStore: stores.transactionStore as never,
      tokenStore: stores.tokenStore as never,
      connectionStore: stores.connectionStore as never,
      encryptionKey: KEY, clientId: "c", clientSecret: "s",
      request: tokenRequest() as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    expect(stores.savedTokens.refresh).toBeUndefined();
  });

  it("returns denied on a provider error without exchanging a code", async () => {
    const stores = fakeStores();
    const outcome = await handleGoogleCallback({
      state: "state-1", code: null, error: "access_denied", sessionEmail: "owner@example.com",
      transactionStore: stores.transactionStore as never,
      tokenStore: stores.tokenStore as never,
      connectionStore: stores.connectionStore as never,
      encryptionKey: KEY, clientId: "c", clientSecret: "s",
      request: tokenRequest() as typeof fetch,
    });
    expect(outcome).toEqual({ ok: false, redirectTo: "/integrations?google=denied" });
    expect(stores.savedTokens.refresh).toBeUndefined();
  });

  it("rejects a missing session outright", async () => {
    const stores = fakeStores();
    const outcome = await handleGoogleCallback({
      state: "state-1", code: "code-1", error: null, sessionEmail: null,
      transactionStore: stores.transactionStore as never,
      tokenStore: stores.tokenStore as never,
      connectionStore: stores.connectionStore as never,
      encryptionKey: KEY, clientId: "c", clientSecret: "s",
      request: tokenRequest() as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
  });
});
