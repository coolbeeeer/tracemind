import { execFile } from "node:child_process";
import { promisify } from "node:util";

const runFile = promisify(execFile);

export type UserTokenRunner = (command: string, args: readonly string[]) => Promise<{ stdout: string }>;

/**
 * Short-lived access token for the operator's own Google login, via
 * Application Default Credentials. This is the no-IAM-admin route:
 * it uses whatever log-read permission the operator already has, so
 * no service account has to be created and no project IAM policy has
 * to be changed. The token is short-lived, is never written to a
 * file, never returned to the browser, and never sent to chat.
 * Operator-run scripts only; never call from a browser action.
 * The caller must already be signed in locally (for example, in
 * Cloud Shell, or with `gcloud auth application-default login`).
 */
export async function getUserGoogleAccessToken(
  run: UserTokenRunner = (command, args) => runFile(command, [...args]),
): Promise<string> {
  let stdout: string;
  try {
    ({ stdout } = await run("gcloud", ["auth", "application-default", "print-access-token"]));
  } catch {
    throw new Error(
      "User Google login unavailable: sign in locally first (for example, `gcloud auth application-default login` in Cloud Shell)",
    );
  }
  const token = stdout.trim();
  if (!token) throw new Error("User Google login returned an empty access token");
  return token;
}
