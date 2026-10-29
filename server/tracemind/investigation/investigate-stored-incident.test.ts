import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getIncident: vi.fn(),
  listLogs: vi.fn(),
  updateStatus: vi.fn(),
  save: vi.fn(),
  run: vi.fn(),
  close: vi.fn(async () => {}),
}));
vi.mock("../monitoring/incident-store.js", () => ({
  createIncidentStore: () => ({
    getIncident: mocks.getIncident,
    listLogs: mocks.listLogs,
    updateIncidentStatus: mocks.updateStatus,
    close: mocks.close,
  }),
}));
vi.mock("./investigation-store.js", () => ({
  createInvestigationStore: () => ({ save: mocks.save, close: mocks.close }),
}));
vi.mock("./run-evidence-investigation.js", () => ({
  runEvidenceInvestigation: mocks.run,
}));
import { investigateStoredIncident } from "./investigate-stored-incident.js";

const base = { databaseUrl: "postgres://unused", incidentId: "INC-1", openaiApiKey: "test-only" };
const incident = {
  id: "INC-1", serviceId: "payments", demo: false, title: "Failure",
  description: "Error", severity: "critical", detectedAt: "2026-10-29T00:00:00Z",
  status: "open", investigationStatus: "not-started",
};
const log = {
  id: "log-1", incidentId: "INC-1", serviceId: "payments",
  timestamp: "2026-10-29T00:00:00Z", level: "error", message: "failure",
};

describe("stored incident investigation", () => {
  it("refuses missing incidents without calling the model", async () => {
    vi.clearAllMocks();
    mocks.getIncident.mockResolvedValue(null);
    await expect(investigateStoredIncident(base)).rejects.toThrow("Incident not found");
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("refuses incidents without evidence", async () => {
    vi.clearAllMocks();
    mocks.getIncident.mockResolvedValue(incident);
    mocks.listLogs.mockResolvedValue([]);
    await expect(investigateStoredIncident(base)).rejects.toThrow("no stored evidence");
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("runs the model and persists the resulting investigation", async () => {
    vi.clearAllMocks();
    mocks.getIncident.mockResolvedValue(incident);
    mocks.listLogs.mockResolvedValue([log]);
    const investigation = { id: "inv-1", incidentId: "INC-1", status: "completed" };
    mocks.run.mockResolvedValue(investigation);
    const result = await investigateStoredIncident(base);
    expect(result).toEqual(investigation);
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({ incident, logs: [log] }));
    expect(mocks.save).toHaveBeenCalledWith(investigation);
    expect(mocks.updateStatus).toHaveBeenCalledWith("INC-1", "investigating");
  });
  it("does not save a fabricated result when model execution fails", async () => {
    vi.clearAllMocks();
    mocks.getIncident.mockResolvedValue(incident);
    mocks.listLogs.mockResolvedValue([log]);
    mocks.run.mockRejectedValue(new Error("model unavailable"));
    await expect(investigateStoredIncident(base)).rejects.toThrow("model unavailable");
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
