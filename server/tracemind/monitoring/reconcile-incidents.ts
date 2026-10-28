import type { DetectedIncident } from "./detect-incidents.js";
import type { Incident } from "../../../shared/tracemind/models.js";
import { toIncident } from "./incident-mapper.js";

/**
 * Storage-agnostic incident reconciliation. The caller supplies existing open
 * incident records from its durable store and persists the returned changes.
 * Do not use an in-memory map for cross-worker deduplication.
 */
export interface StoredIncident {
  fingerprint: string;
  incident: Incident;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
}

export interface ReconciliationResult {
  inserts: StoredIncident[];
  updates: StoredIncident[];
}

export function reconcileIncidents(
  detected: readonly DetectedIncident[],
  existing: readonly StoredIncident[],
  makeId: () => string,
): ReconciliationResult {
  const openByKey = new Map<string, StoredIncident>();
  for (const record of existing) {
    if (record.incident.status !== "resolved") {
      openByKey.set(`${record.incident.serviceId}\0${record.fingerprint}`, record);
    }
  }
  const inserts: StoredIncident[] = [];
  const updates: StoredIncident[] = [];
  for (const candidate of detected) {
    const key = `${candidate.serviceId}\0${candidate.fingerprint}`;
    const previous = openByKey.get(key);
    if (previous) {
      // Polling windows overlap. Never sum their counts: that double counts
      // events already observed. Count is a lower bound until event IDs are stored.
      if (candidate.lastSeenAt <= previous.lastSeenAt) continue;
      const updated: StoredIncident = {
        ...previous,
        lastSeenAt: candidate.lastSeenAt,
        occurrenceCount: Math.max(previous.occurrenceCount, candidate.occurrenceCount),
      };
      updates.push(updated);
      openByKey.set(key, updated);
    } else {
      const created: StoredIncident = {
        fingerprint: candidate.fingerprint,
        incident: toIncident(candidate, makeId()),
        firstSeenAt: candidate.firstSeenAt,
        lastSeenAt: candidate.lastSeenAt,
        occurrenceCount: candidate.occurrenceCount,
      };
      inserts.push(created);
      openByKey.set(key, created);
    }
  }
  return { inserts, updates };
}
