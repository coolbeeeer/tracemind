import type { MonitoringEvent } from "./detect-incidents.js";

/** Minimal shape of a Google Cloud Logging entry; no credentials or SDK required. */
export interface CloudLoggingEntry {
  insertId?: string;
  timestamp?: string;
  receiveTimestamp?: string;
  severity?: string | number;
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  httpRequest?: { status?: number };
  trace?: string;
  resource?: { type?: string; labels?: Record<string, string> };
}

function severityOf(value: string | number | undefined): MonitoringEvent["severity"] {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number)) {
    if (number >= 500) return "ERROR";
    if (number >= 400) return "WARNING";
    return "INFO";
  }
  const label = String(value ?? "DEFAULT").toUpperCase();
  if (["ERROR", "CRITICAL", "ALERT", "EMERGENCY"].includes(label)) return "ERROR";
  if (label === "WARNING" || label === "WARN") return "WARNING";
  return "INFO";
}

function messageOf(entry: CloudLoggingEntry): string {
  if (typeof entry.textPayload === "string") return entry.textPayload;
  const payload = entry.jsonPayload;
  if (payload) {
    for (const key of ["message", "msg", "error"]) {
      if (typeof payload[key] === "string") return payload[key] as string;
    }
    return JSON.stringify(payload).slice(0, 4000);
  }
  return "";
}

/**
 * Converts a Cloud Run log entry to the shared monitoring event.
 * Caller must validate tenant/project/service authorization before querying Cloud Logging.
 * Do not persist raw payloads containing secrets without redaction.
 */
export function normalizeCloudRunLog(
  entry: CloudLoggingEntry,
  serviceId: string,
): MonitoringEvent | null {
  if (!serviceId.trim()) throw new Error("serviceId required");
  const timestamp = entry.timestamp ?? entry.receiveTimestamp;
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return null;
  const message = messageOf(entry);
  if (!message) return null;
  const status = entry.httpRequest?.status;
  const httpStatus = typeof status === "number" && status >= 100 && status <= 599 ? status : undefined;
  const traceId = entry.trace?.split("/traces/")[1];
  return {
    id: entry.insertId ?? `${serviceId}:${timestamp}:${message.slice(0, 32)}`,
    serviceId,
    timestamp: new Date(timestamp).toISOString(),
    severity: severityOf(entry.severity),
    message,
    ...(httpStatus !== undefined ? { httpStatus } : {}),
    ...(traceId ? { traceId } : {}),
  };
}
