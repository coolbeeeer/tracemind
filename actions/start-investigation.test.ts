import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getIncident: vi.fn(),
  listForIncident: vi.fn(),
  lockAcquired: true,
  release: vi.fn(async () => {}),
  orchestrate: vi.fn(),
  close: vi.fn(async () => {}),
}));
vi.mock("../server/tracemind/monitoring/incident-store.js", () => ({
  createIncidentStore: () => ({
    getIncident: mocks.getIncident,
    close: mocks.close,
  }),
}));
vi.mock("../server/tracemind/investigation/investigation-store.js", () => ({
  createInvestigationStore: () => ({
    listForIncident: mocks.listForIncident,
    close: mocks.close,
  }),
}));
vi.mock("../server/tracemind/investigation/investigation-lock.js", () => ({
  tryAcquireInvestigationLock: async () => ({
    acquired: mocks.lockAcquired,
    release: mocks.release,
  }),
}));
vi.mock("../server/tracemind/investigation/investigate-stored-incident.js", () => ({
  investigateStoredIncident: mocks.orchestrate,
}));
vi.mock("@agent-native/core/credentials", () => ({
  resolveCredential: async () => "server-key",
}));

import action, { authorizeStartInvestigation } from "./start-investigation.js";

const incident = {
  id: "INC-1", serviceId: "payments", demo: false, title: "Failure",
  description: "Error", severity: "critical", detectedAt: "2026-10-29T00:00:00Z",
  status: "open", investigationStatus: "not-started",
};
const completed = {
  id: "inv-1", incidentId: "INC-1", status: "completed",
  startedAt: "2026-10-29T00:00:00Z", steps: [], hypotheses: [], fixes: [],
};

describe("start-investigation authorization", () => {
  it("refuses unauthenticated callers", () => {
    expect(authorizeStartInvestigation({ incidentId: "INC-1" })).toBe(false);
    expect(authorizeStartInvestigation({ incidentId: "INC-1" }, {})).toBe(false);
    expect(authorizeStartInvestigation({ incidentId: "INC-1" }, { userEmail: "owner@example.com" } as never)).toBe(true);
  });
});

describe("start-investigation run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lockAcquired = true;
    process.env.DATABASE_URL = "postgres://unused";
    mocks.getIncident.mockResolvedValue(incident);
    mocks.listForIncident.mockResolvedValue([]);
    mocks.orchestrate.mockResolvedValue(completed);
  });

  it("refuses missing incidents without calling the model", async () => {
    mocks.getIncident.mockResolvedValue(null);
    await expect(action.run({ incidentId: "INC-9" }, { userEmail: "owner@example.com", caller: "frontend" } as never)).rejects.toThrow(/not found or not investigable/);
    expect(mocks.orchestrate).not.toHaveBeenCalled();
  });

  it("refuses demo incidents without calling the model", async () => {
    mocks.getIncident.mockResolvedValue({ ...incident, demo: true });
    await expect(action.run({ incidentId: "INC-1" }, { userEmail: "owner@example.com", caller: "frontend" } as never)).rejects.toThrow(/not found or not investigable/);
    expect(mocks.orchestrate).not.toHaveBeenCalled();
  });

  it("returns an existing completed investigation without a new model call", async () => {
    mocks.listForIncident.mockResolvedValue([completed]);
    const result = await action.run({ incidentId: "INC-1" }, { userEmail: "owner@example.com", caller: "frontend" } as never);
    expect(result).toEqual({ investigation: completed, started: false, demo: false });
    expect(mocks.orchestrate).not.toHaveBeenCalled();
  });

  it("refuses a duplicate run while the lock is held, without calling the model", async () => {
    mocks.lockAcquired = false;
    await expect(action.run({ incidentId: "INC-1" }, { userEmail: "owner@example.com", caller: "frontend" } as never)).rejects.toThrow(/already in progress/);
    expect(mocks.orchestrate).not.toHaveBeenCalled();
  });

  it("starts a run with server credentials only, ignoring caller-supplied keys", async () => {
    const result = await action.run({ incidentId: "INC-1", openaiApiKey: "attacker-key" } as never, { userEmail: "owner@example.com", caller: "frontend" } as never);
    expect(result.started).toBe(true);
    expect(mocks.orchestrate).toHaveBeenCalledWith({
      databaseUrl: "postgres://unused",
      incidentId: "INC-1",
      openaiApiKey: "server-key",
    });
    expect(mocks.release).toHaveBeenCalled();
  });
});
