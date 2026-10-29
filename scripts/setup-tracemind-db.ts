import { readFile } from "node:fs/promises";
import postgres from "postgres";

/**
 * Run with DATABASE_URL set to a Neon connection string:
 *   pnpm exec tsx scripts/setup-tracemind-db.ts
 *
 * Schema changes are intentionally explicit and not run on app startup.
 * Run against a development branch/database before production.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required; use a server-side environment variable");
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string");
  }
  const sql = postgres(url, { max: 1, ssl: "require" });
  try {
    const schema = await readFile(
      new URL("../server/tracemind/monitoring/schema.sql", import.meta.url),
      "utf8",
    );
    await sql.unsafe(schema).execute();
    const rows = await sql`
      select to_regclass('public.tracemind_incidents') as incidents,
             to_regclass('public.tracemind_logs') as logs
    `;
    if (!rows[0]?.incidents || !rows[0]?.logs) {
      throw new Error("TraceMind schema verification failed");
    }
    console.log("TraceMind database schema installed and verified.");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database setup failed");
  process.exitCode = 1;
});
