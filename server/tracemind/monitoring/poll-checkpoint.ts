import postgres from "postgres";

/**
 * A single database session holds a per-service advisory lock for the entire
 * poll, preventing overlapping workers from reconciling the same incidents.
 * The checkpoint only advances after the poll succeeds.
 */
export async function withMonitoringCheckpoint<T>(
  connectionString: string,
  target: { projectId: string; serviceName: string; region: string },
  poll: (since: string) => Promise<T>,
  now = new Date(),
): Promise<{ skipped: boolean; result?: T }> {
  const sql = postgres(connectionString, { max: 1 });
  const key = `tracemind:${target.projectId}:${target.region}:${target.serviceName}`;
  let locked = false;
  try {
    const lockRows = await sql`select pg_try_advisory_lock(hashtextextended(${key}, 0)) as acquired`;
    locked = lockRows[0]?.acquired === true;
    if (!locked) return { skipped: true };
    const rows = await sql`
      select last_successful_at from tracemind_poll_checkpoints
      where project_id = ${target.projectId}
        and service_name = ${target.serviceName}
        and region = ${target.region}
    `;
    const previous = rows[0]?.last_successful_at;
    const since = previous
      ? new Date(new Date(previous as string).getTime() - 60_000).toISOString()
      : new Date(now.getTime() - 5 * 60_000).toISOString();
    const result = await poll(since);
    await sql`
      insert into tracemind_poll_checkpoints
        (project_id, service_name, region, last_successful_at)
      values (${target.projectId}, ${target.serviceName}, ${target.region}, ${now.toISOString()})
      on conflict (project_id, service_name, region)
      do update set
        last_successful_at = greatest(
          tracemind_poll_checkpoints.last_successful_at,
          excluded.last_successful_at
        ),
        updated_at = now()
    `;
    return { skipped: false, result };
  } finally {
    if (locked) {
      await sql`select pg_advisory_unlock(hashtextextended(${key}, 0))`;
    }
    await sql.end();
  }
}
