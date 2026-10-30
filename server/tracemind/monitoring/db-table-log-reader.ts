import { createHash } from "node:crypto";
import type { MonitoringEvent } from "./detect-incidents.js";
import { severityOfMessage } from "./error-severity.js";

/**
 * Reads error logs out of a database table the caller names. This is for
 * applications that write their own logs to a table (the common
 * self-hosted pattern); it is NOT server log access, which SQL cannot
 * provide. The caller supplies the table and column names and a
 * read-only executor; this module never opens a connection itself, so
 * no credential ever passes through it.
 */
export interface DbLogQuery {
  /** Table holding the logs, e.g. "app_logs" or "public.app_logs". */
  table: string;
  /** Service id the rows belong to, e.g. the application name. */
  serviceId: string;
  timestampColumn: string;
  messageColumn: string;
  /** Optional level column (values like ERROR, WARN, INFO). Without it, the message text decides. */
  levelColumn?: string;
  since: string;
  limit?: number;
}

export interface DbLogExecutor {
  query(text: string, params: unknown[]): Promise<Record<string, unknown>[]>;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function qualifiedIdentifier(value: string, field: string): string {
  const parts = value.split(".");
  if (parts.length < 1 || parts.length > 2 || parts.some(p => !IDENTIFIER.test(p))) {
    throw new Error(`Invalid ${field}: expected a table or schema.table identifier`);
  }
  return parts.join(".");
}

function identifier(value: string, field: string): string {
  if (!IDENTIFIER.test(value)) throw new Error(`Invalid ${field}: expected a column identifier`);
  return value;
}

function levelOf(value: unknown, message: string): MonitoringEvent["severity"] {
  if (typeof value === "string") {
    const label = value.trim().toUpperCase();
    if (["ERROR", "ERR", "FATAL", "CRITICAL"].includes(label)) return "ERROR";
    if (label === "WARNING" || label === "WARN") return "WARNING";
    if (label === "INFO" || label === "DEBUG" || label === "TRACE") return "INFO";
  }
  return severityOfMessage(message);
}

function timestampOf(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Epoch milliseconds, as most drivers return for timestamptz.
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return null;
}

export async function fetchDbTableLogs(
  query: DbLogQuery,
  execute: DbLogExecutor,
): Promise<MonitoringEvent[]> {
  const table = qualifiedIdentifier(query.table, "table");
  const timestampColumn = identifier(query.timestampColumn, "timestampColumn");
  const messageColumn = identifier(query.messageColumn, "messageColumn");
  const levelColumn = query.levelColumn
    ? identifier(query.levelColumn, "levelColumn")
    : null;
  if (!query.serviceId.trim()) throw new Error("serviceId required");
  if (!Number.isFinite(Date.parse(query.since))) {
    throw new Error("Invalid since timestamp");
  }
  const limit = Math.min(1000, Math.max(1, query.limit ?? 250));
  // Fetch one row past the limit: if it exists, more rows remain unread,
  // and returning the partial set would let a checkpoint advance past
  // logs that were never read. Fail instead, mirroring the cloud
  // collectors' pagination-truncation rule.
  const sql =
    `SELECT ${timestampColumn}, ${messageColumn}` +
    `${levelColumn ? `, ${levelColumn}` : ""} ` +
    `FROM ${table} WHERE ${timestampColumn} >= $1 ` +
    `ORDER BY ${timestampColumn} ASC LIMIT ${limit + 1}`;
  const rows = await execute.query(sql, [new Date(query.since).toISOString()]);
  if (rows.length > limit) {
    throw new Error(
      "Database log read truncated: more rows remain after the configured limit",
    );
  }
  const events: MonitoringEvent[] = [];
  for (const row of rows) {
    const timestamp = timestampOf(row[timestampColumn]);
    const message = row[messageColumn];
    if (!timestamp || typeof message !== "string" || !message) continue;
    const digest = createHash("sha256").update(message, "utf8").digest("hex").slice(0, 16);
    events.push({
      id: `${query.serviceId}:${timestamp}:${digest}`,
      serviceId: query.serviceId,
      timestamp,
      severity: levelOf(levelColumn ? row[levelColumn] : undefined, message),
      message,
    });
  }
  return events;
}
