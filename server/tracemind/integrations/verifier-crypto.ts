import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for the PKCE verifier at rest. The key is
 * server-managed and separate from the database: it is resolved from
 * the framework credential vault by the caller, never stored in the
 * database, and never passed to the browser. A 32-byte key is
 * required; anything else is a caller error, never silently padded.
 * Format: base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext).
 */
export function encryptVerifier(verifier: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Verifier encryption requires a 32-byte key");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(verifier, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptVerifier(encrypted: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Verifier decryption requires a 32-byte key");
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted verifier");
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
