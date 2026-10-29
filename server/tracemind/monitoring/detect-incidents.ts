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
    // Form non-overlapping bursts. A new burst begins when the time since
    // the previous matching error exceeds the configured window.
    let burstStart = 0;
    const emit = (start: number, end: number) => {
      const burst = entries.slice(start, end);
      if (burst.length < minOccurrences) return;
      // Avoid treating a long, low-frequency stream as a spike.
      // burst.length >= minOccurrences here (checked above), so these
      // indexes are defined; the assertions only satisfy strict indexing.
      const firstThreshold = burst[minOccurrences - 1]!.ms - burst[0]!.ms;
      if (firstThreshold > windowMs) return;
      incidents.push({
        fingerprint,
        serviceId: burst[0]!.event.serviceId,
        firstSeenAt: burst[0]!.event.timestamp,
        lastSeenAt: burst[burst.length - 1]!.event.timestamp,
        occurrenceCount: burst.length,
        sampleEventIds: burst.slice(0, 10).map(x => x.event.id),
        summary: burst[burst.length - 1]!.event.message.slice(0, 300),
        severity: burst.some(x => (x.event.httpStatus ?? 0) >= 500) ? "critical" : "warning",
      });
    };
    for (let i = 1; i < entries.length; i++) {
      if (entries[i]!.ms - entries[i - 1]!.ms > windowMs) {
        emit(burstStart, i);
        burstStart = i;
      }
    }
    emit(burstStart, entries.length);
  }
  return incidents.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}
