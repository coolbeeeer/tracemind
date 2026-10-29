import type { MonitoringEvent } from "./detect-incidents.js";

/** Redact credentials before fingerprinting, incident summaries, or persistence. */
export function redactMonitoringMessage(message: string): string {
  return message
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/(password|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 2000);
}

export function redactMonitoringEvents(events: readonly MonitoringEvent[]): MonitoringEvent[] {
  return events.map(event => ({ ...event, message: redactMonitoringMessage(event.message) }));
}
