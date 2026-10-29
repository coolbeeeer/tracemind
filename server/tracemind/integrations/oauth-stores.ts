import { createHash } from "node:crypto";
import postgres from "postgres";
import { decryptVerifier, encryptVerifier } from "./verifier-crypto.js";

/** SHA-256 hash of the random OAuth state. Only the hash is stored; the raw state is sent to Google and never persisted. */
export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export interface OAuthTransaction {
  stateHash: string;
  userEmail: string;
  /** Decrypted PKCE verifier, available only after a successful atomic claim. */
  codeVerifier: string;
  redirectUri: string;
  expiresAt: string;
}

export interface OAuthTransactionStore {
  create(input: {
    userEmail: string;
    state: string;
    codeVerifier: string;
    redirectUri: string;
    expiresAt: string;
    encryptionKey: Buffer;
  }): Promise<void>;
  /**
   * Atomically claim a transaction: set consumed_at only when the
   * row is unconsumed and unexpired, and return it. Returns null
   * for missing, expired, or already-consumed state, so a replayed
   * callback cannot exchange the code a second time.
   */
  claim(state: string, encryptionKey: Buffer, now?: Date): Promise<OAuthTransaction | null>;
}

export function createOAuthTransactionStore(connectionString: string): OAuthTransactionStore & { close(): Promise<void> } {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sql = postgres(connectionString, { max: 5 });
  return {
    async create(input) {
      const stateHash = hashOAuthState(input.state);
      await sql`
        insert into tracemind_oauth_transactions
          (state_hash, user_email, code_verifier_encrypted, redirect_uri, expires_at)
        values (
          ${stateHash},
          ${input.userEmail},
          ${encryptVerifier(input.codeVerifier, input.encryptionKey)},
          ${input.redirectUri},
          ${input.expiresAt}
        )
      `;
    },
    async claim(state, encryptionKey, now = new Date()) {
      const stateHash = hashOAuthState(state);
      const rows = await sql`
        update tracemind_oauth_transactions
        set consumed_at = ${now.toISOString()}
        where state_hash = ${stateHash}
          and consumed_at is null
          and expires_at > ${now.toISOString()}
        returning user_email, code_verifier_encrypted, redirect_uri, expires_at
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        stateHash,
        userEmail: row.user_email as string,
        codeVerifier: decryptVerifier(row.code_verifier_encrypted as string, encryptionKey),
        redirectUri: row.redirect_uri as string,
        expiresAt: new Date(row.expires_at as string).toISOString(),
      };
    },
    async close() {
      await sql.end();
    },
  };
}

export type GoogleConnectionStatus = "connected" | "reconnect-required" | "permission-denied" | "not-connected";

export interface GoogleConnection {
  userEmail: string;
  status: GoogleConnectionStatus;
  googleAccountEmail: string | null;
  scopes: string;
  projectId: string | null;
  serviceName: string | null;
  region: string | null;
  connectedAt: string | null;
}

export interface GoogleConnectionStore {
  upsert(connection: GoogleConnection): Promise<void>;
  get(userEmail: string): Promise<GoogleConnection | null>;
  delete(userEmail: string): Promise<void>;
}

export function createGoogleConnectionStore(connectionString: string): GoogleConnectionStore & { close(): Promise<void> } {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sql = postgres(connectionString, { max: 5 });
  return {
    async upsert(connection) {
      await sql`
        insert into tracemind_google_connections
          (user_email, status, google_account_email, scopes, project_id, service_name, region, connected_at, updated_at)
        values (
          ${connection.userEmail},
          ${connection.status},
          ${connection.googleAccountEmail},
          ${connection.scopes},
          ${connection.projectId},
          ${connection.serviceName},
          ${connection.region},
          ${connection.connectedAt},
          now()
        )
        on conflict (user_email) do update set
          status = excluded.status,
          google_account_email = excluded.google_account_email,
          scopes = excluded.scopes,
          project_id = excluded.project_id,
          service_name = excluded.service_name,
          region = excluded.region,
          connected_at = excluded.connected_at,
          updated_at = now()
      `;
    },
    async get(userEmail) {
      const rows = await sql`
        select user_email, status, google_account_email, scopes, project_id, service_name, region, connected_at
        from tracemind_google_connections where user_email = ${userEmail} limit 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        userEmail: row.user_email as string,
        status: row.status as GoogleConnectionStatus,
        googleAccountEmail: row.google_account_email as string | null,
        scopes: row.scopes as string,
        projectId: row.project_id as string | null,
        serviceName: row.service_name as string | null,
        region: row.region as string | null,
        connectedAt: row.connected_at ? new Date(row.connected_at as string).toISOString() : null,
      };
    },
    async delete(userEmail) {
      await sql`delete from tracemind_google_connections where user_email = ${userEmail}`;
    },
    async close() {
      await sql.end();
    },
  };
}
