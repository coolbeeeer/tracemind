import { describe, expect, it, vi } from "vitest";
import { getUserGoogleAccessToken } from "./google-user-token.js";

describe("user Google access token", () => {
  it("trims the token returned by gcloud", async () => {
    const run = vi.fn(async () => ({ stdout: "  ya29.test-token\n" }));
    await expect(getUserGoogleAccessToken(run)).resolves.toBe("ya29.test-token");
    expect(run).toHaveBeenCalledWith("gcloud", ["auth", "application-default", "print-access-token"]);
  });

  it("explains sign-in when gcloud is not authenticated", async () => {
    const run = vi.fn(async () => { throw new Error("not authenticated"); });
    await expect(getUserGoogleAccessToken(run)).rejects.toThrow(/sign in locally/);
  });

  it("rejects an empty token instead of calling the API unauthenticated", async () => {
    const run = vi.fn(async () => ({ stdout: "   \n" }));
    await expect(getUserGoogleAccessToken(run)).rejects.toThrow(/empty access token/);
  });
});
