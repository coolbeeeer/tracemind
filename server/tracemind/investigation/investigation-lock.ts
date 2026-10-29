import postgres from "postgres";

/**
 * Per-incident advisory lock, held for the whole investigation run.
 * A second caller for the same incident cannot acquire it, so it can
 * never start a duplicate paid model run. The lock is released in a
 * finally block by the caller; it is not a substitute for the
 * completed-investigation check, which handles the case where the
 * first run already finished.
 */
export async function tryAcquireInvestigationLock(
  connectionString: string,
  incidentId: string,
): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  const sql = postgres(connectionString, { max: 1 });
  const key = `tracemind:investigation:${incidentId}`;
  const rows = await sql`select pg_try_advisory_lock(hashtextextended(${key}, 0)) as acquired`;
  const acquired = rows[0]?.acquired === true;
  return {
    acquired,
    release: async () => {
      if (acquired) {
        await sql`select pg_advisory_unlock(hashtextextended(${key}, 0))`;
      }
      await sql.end();
    },
  };
}
