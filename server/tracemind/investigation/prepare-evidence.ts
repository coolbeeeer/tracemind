import type { Incident, Investigation, LogEntry } from "../../../shared/tracemind/models.js";
import { randomUUID } from "node:crypto";

/**
 * Evidence-only investigation preparation. No AI inference is performed.
 * Future agent execution must use these source log IDs and verified code refs.
 */
export function prepareInvestigationEvidence(
  incident: Incident,
  logs: readonly LogEntry[],
  now = new Date().toISOString(),
): Investigation {
  const relevant = logs.filter(log => log.incidentId === incident.id);
  return {
    id: `inv-${randomUUID()}`,
    incidentId: incident.id,
    status: "not-started",
    startedAt: now,
    steps: relevant.slice(0, 20).map(log => ({
      id: `evidence-${log.id}`,
      investigationId: incident.id,
      tool: "stored-log-evidence",
      input: JSON.stringify({ logId: log.id, serviceId: log.serviceId, timestamp: log.timestamp }),
      output: log.message,
      status: "completed",
      startedAt: now,
      completedAt: now,
    })),
    hypotheses: [],
    fixes: [],
    demo: false,
  };
}
