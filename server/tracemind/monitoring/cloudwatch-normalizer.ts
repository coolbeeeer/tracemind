import type { MonitoringEvent } from "./detect-incidents.js";
import { severityOfMessage } from "./error-severity.js";

/** Minimal shape of a CloudWatch Logs FilterLogEvents event. */
export interface CloudWatchLogEvent {
  eventId?: string;
  timestamp?: number;
  message?: string;
  logStreamName?: string;
}

/**
 * Converts a CloudWatch log event to the shared monitoring event.
 * CloudWatch carries no HTTP status and no trace id, so those fields are
 * absent: detection groups on service + normalized message, and a burst
 * without an HTTP 500 classifies as warning, not critical. The caller
 * supplies the service id (normally the log group name) and must have
 * validated tenant authorization before querying CloudWatch.
 */
export function normalizeCloudWatchLog(
  event: CloudWatchLogEvent,
  serviceId: string,
): MonitoringEvent | null {
  if (!serviceId.trim()) throw new Error("serviceId required");
  if (typeof event.timestamp !== "number" || !Number.isFinite(event.timestamp)) {
    return null;
  }
  const timestamp = new Date(event.timestamp).toISOString();
  if (!Number.isFinite(Date.parse(timestamp))) return null;
  const message = typeof event.message === "string" ? event.message : "";
  if (!message) return null;
  return {
    id: event.eventId ?? `${serviceId}:${timestamp}:${message.slice(0, 32)}`,
    serviceId,
    timestamp,
    severity: severityOfMessage(message),
    message,
  };
}
