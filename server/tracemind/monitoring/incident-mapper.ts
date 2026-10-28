import type { DetectedIncident } from "./detect-incidents.js";
import type { Incident } from "../../../shared/tracemind/models.js";

/** Converts detector output into the existing UI/Agent-Native incident contract. */
export function toIncident(candidate: DetectedIncident, id: string): Incident {
  if (!id) throw new Error("A persistent incident ID is required");
  return {
    id,
    serviceId: candidate.serviceId,
    title: candidate.summary.slice(0, 120) || "Repeated application error",
    description: `${candidate.occurrenceCount} matching failures detected. Fingerprint: ${candidate.fingerprint}`,
    severity: candidate.severity,
    detectedAt: candidate.firstSeenAt,
    status: "open",
    investigationStatus: "not-started",
    demo: false,
  };
}
