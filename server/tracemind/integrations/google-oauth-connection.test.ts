import { describe, expect, it } from "vitest";
import {
  GOOGLE_LOGGING_READ_SCOPE,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  generateOAuthState,
  generatePkceVerifier,
  getValidGoogleAccessToken,
  pkceChallenge,
  refreshGoogleAccessToken,
} from "./google-oauth-connection.js";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Google OAuth connection primitives", () => {
  it("builds an authorization URL with only the logging.read scope and offline access", () => {
    const url = buildAuthorizationUrl({
      clientId: "client-123",
      redirectUri: "https://app.example/_agent-native/google/callback",
      state: "state-abc",
      codeChallenge: "challenge-xyz",
    });
    expect(url.searchParams.get("scope")).toBe(GOOGLE_LOGGING_READ_SCOPE);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("derives a deterministic PKCE challenge and unique states", () => {
    expect(pkceChallenge("verifier")).toBe(pkceChallenge("verifier"));
    expect(pkceChallenge("verifier")).not.toBe("verifier");
    expect(generateOAuthState()).not.toBe(generateOAuthState());
    expect(generatePkceVerifier()).not.toBe(generatePkceVerifier());
  });

  it("exchanges a code only when logging.read was granted and a refresh token returned", async () => {
    const request = async () => jsonResponse({
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_in: 3600,
      scope: GOOGLE_LOGGING_READ_SCOPE,
    });
    const tokens = await exchangeAuthorizationCode({
      code: "code-1", codeVerifier: "verifier-1", clientId: "c", clientSecret: "s",
      redirectUri: "https://app.example/callback", request: request as typeof fetch,
    });
    expect(tokens.refreshToken).toBe("refresh-1");
  });

  it("refuses a code exchange without a refresh token or without the logging scope", async () => {
    const noRefresh = async () => jsonResponse({
      access_token: "access-1", expires_in: 3600, scope: GOOGLE_LOGGING_READ_SCOPE,
    });
    await expect(exchangeAuthorizationCode({
      code: "code-1", codeVerifier: "v", clientId: "c", clientSecret: "s",
      redirectUri: "https://app.example/callback", request: noRefresh as typeof fetch,
    })).rejects.toThrow(/refresh token/);
    const wrongScope = async () => jsonResponse({
      access_token: "access-1", refresh_token: "r", expires_in: 3600, scope: "openid",
    });
    await expect(exchangeAuthorizationCode({
      code: "code-1", codeVerifier: "v", clientId: "c", clientSecret: "s",
      redirectUri: "https://app.example/callback", request: wrongScope as typeof fetch,
    })).rejects.toThrow(/logging\.read/);
  });

  it("returns a fresh access token unchanged and refreshes an expired one", async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const fresh = await getValidGoogleAccessToken({
      stored: { accessToken: "still-good", refreshToken: "r", accessTokenExpiresAt: future },
      clientId: "c", clientSecret: "s", request: async () => { throw new Error("must not refresh"); },
    });
    expect(fresh.accessToken).toBe("still-good");

    const past = new Date(Date.now() - 1000).toISOString();
    const refresh = async () => jsonResponse({
      access_token: "access-2", expires_in: 3600, scope: GOOGLE_LOGGING_READ_SCOPE,
    });
    const refreshed = await getValidGoogleAccessToken({
      stored: { accessToken: "old", refreshToken: "r", accessTokenExpiresAt: past },
      clientId: "c", clientSecret: "s", request: refresh as typeof fetch,
    });
    expect(refreshed.accessToken).toBe("access-2");
    expect(refreshed.stored.refreshToken).toBe("r");
    expect(Date.parse(refreshed.stored.accessTokenExpiresAt)).toBeGreaterThan(Date.now());
  });

  it("surfaces token endpoint failures without echoing a body", async () => {
    const failing = async () => new Response("bad", { status: 400 });
    await expect(refreshGoogleAccessToken({
      refreshToken: "r", clientId: "c", clientSecret: "s", request: failing as typeof fetch,
    })).rejects.toThrow(/HTTP 400/);
  });
});
