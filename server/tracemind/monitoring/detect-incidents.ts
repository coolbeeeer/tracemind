/** Pure, deterministic error grouping for the TraceMind monitoring pipeline. */
export interface MonitoringEvent {
  id: string;
  serviceId: string;
  timestamp: string;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  traceId?: string;
  httpStatus?: number;
}

export interface DetectedIncident {
  fingerprint: string;
  serviceId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  sampleEventIds: string[];
  summary: string;
  severity: "critical" | "warning";
}

/** Normalize variable IDs, addresses and numbers so repeats share a fingerprint. */
export function fingerprintError(event: MonitoringEvent): string {
  const normalized = event.message
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "<uuid>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return `${event.serviceId}:${event.httpStatus ?? ""}:${normalized}`;
}

/**
 * Groups unexpected errors within a configurable time window.
 * This is a batch detector, not a scheduler or a live cloud connection.
 * Expected 4xx/business rejections are excluded unless explicitly logged as ERROR.
 */
export function detectIncidents(
  events: readonly MonitoringEvent[],
  options: { windowMs?: number; minOccurrences?: number } = {},
): DetectedIncident[] {
  const windowMs = options.windowMs ?? 5 * 60_000;
  const minOccurrences = options.minOccurrences ?? 3;
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("windowMs must be positive");
  if (!Number.isInteger(minOccurrences) || minOccurrences < 1) throw new Error("minOccurrences must be a positive integer");

  const sorted = events
    .filter(e => e.severity === "ERROR" || (e.httpStatus !== undefined && e.httpStatus >= 500))
    .map(e => ({ event: e, ms: Date.parse(e.timestamp) }))
    .filter(x => Number.isFinite(x.ms))
    .sort((a, b) => a.ms - b.ms);
  const buckets = new Map<string, typeof sorted>();
  for (const item of sorted) {
    const key = fingerprintError(item.event);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const incidents: DetectedIncident[] = [];
  for (const [fingerprint, entries] of buckets) {
    let start = 0;
    for (let end = 0; end < entries.length; end++) {
      while (entries[end].ms - entries[start].ms > windowMs) start++;
      if (end - start + 1 < minOccurrences) continue;
      const window = entries.slice(start, end + 1);
      incidents.push({
        fingerprint,
        serviceId: entries[end].event.serviceId,
        firstSeenAt: window[0].event.timestamp,
        lastSeenAt: entries[end].event.timestamp,
        occurrenceCount: window.length,
        sampleEventIds: window.slice(0, 10).map(x => x.event.id),
        summary: entries[end].event.message.slice(0, 300),
        severity: window.some(x => (x.event.httpStatus ?? 0) >= 500) ? "critical" : "warning",
      });
      // One incident per contiguous burst; avoid emitting overlapping windows.
      start = end + 1;
    }
  }
  return incidents.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}
