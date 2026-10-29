import type { Investigation } from "../../../shared/tracemind/models.js";
import { createIncidentStore } from "../monitoring/incident-store.js";
import { createInvestigationStore } from "./investigation-store.js";
import { runEvidenceInvestigation } from "./run-evidence-investigation.js";

/**
 * Server-only orchestration. Never expose this directly as an unauthenticated
 * browser action: callers must authenticate and authorize incident access.
 */
export async function investigateStoredIncident(input: {
  databaseUrl: string;
  incidentId: string;
  openaiApiKey: string;
  github?: { owner: string; repo: string; ref: string; path: string; accessToken: string };
}): Promise<Investigation> {
  if (!input.databaseUrl || !input.openaiApiKey) throw new Error("Server credentials are required");
  const incidents = createIncidentStore(input.databaseUrl);
  const investigations = createInvestigationStore(input.databaseUrl);
  try {
    const incident = await incidents.getIncident(input.incidentId);
    if (!incident) throw new Error("Incident not found");
    if (incident.demo) throw new Error("Demo incidents cannot be investigated");
    const logs = await incidents.listLogs(incident.id);
    if (!logs.length) throw new Error("Incident has no stored evidence");
    const result = await runEvidenceInvestigation({
      incident, logs, openaiApiKey: input.openaiApiKey,
      ...(input.github ? { github: input.github } : {}),
    });
    await investigations.save(result);
    await incidents.updateIncidentStatus(incident.id, "investigating");
    return result;
  } finally {
    await Promise.all([incidents.close(), investigations.close()]);
  }
}
