/**
 * TraceMind contract tests — frontend side, no backend required.
 *
 * These tests pin the contract that the backend store must satisfy
 * when actions are wired to it (see docs/integration-testing.md):
 * every demo row parses against its shared schema, and the mock
 * adapter behaves the way the pages rely on (filters, null for
 * unknown ids, and a throwing startInvestigation).
 *
 * They do not test the backend store itself, which lives on a
 * different branch and needs a real PostgreSQL instance. They also
 * do not test any UI component.
 */
import { describe, expect, it } from "vitest";

import { MockTraceMindApi } from "../../app/lib/tracemind/api.js";
import {
  demoDeployments,
  demoHealth,
  demoIncidents,
  demoIntegrations,
  demoInvestigations,
  demoLogs,
  demoServices,
} from "./demo-data.js";
import {
  deploymentSchema,
  incidentSchema,
  integrationSchema,
  investigationSchema,
  logEntrySchema,
  serviceHealthSchema,
  serviceSchema,
} from "./schemas.js";

describe("demo data parses against shared schemas", () => {
  it("services", () => {
    for (const service of demoServices) {
      expect(serviceSchema.safeParse(service).success).toBe(true);
    }
  });

  it("incidents", () => {
    for (const incident of demoIncidents) {
      expect(incidentSchema.safeParse(incident).success).toBe(true);
    }
  });

  it("health points", () => {
    for (const point of demoHealth) {
      expect(serviceHealthSchema.safeParse(point).success).toBe(true);
    }
  });

  it("logs", () => {
    for (const log of demoLogs) {
      expect(logEntrySchema.safeParse(log).success).toBe(true);
    }
  });

  it("investigations", () => {
    for (const investigation of demoInvestigations) {
      expect(investigationSchema.safeParse(investigation).success).toBe(true);
    }
  });

  it("integrations", () => {
    for (const integration of demoIntegrations) {
      expect(integrationSchema.safeParse(integration).success).toBe(true);
    }
  });

  it("deployments", () => {
    for (const deployment of demoDeployments) {
      expect(deploymentSchema.safeParse(deployment).success).toBe(true);
    }
  });
});

describe("mock adapter behaviour the pages rely on", () => {
  const api = new MockTraceMindApi();

  it("filters incidents by severity and query", async () => {
    const critical = await api.listIncidents({ severity: "critical" });
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.every((i) => i.severity === "critical")).toBe(true);
    const payments = await api.listIncidents({ query: "payments" });
    expect(payments.some((i) => i.id === "INC-1042")).toBe(true);
  });

  it("returns null for unknown incident and investigation ids", async () => {
    expect(await api.getIncident("INC-9999")).toBeNull();
    expect(await api.getInvestigation("inv-9999")).toBeNull();
  });

  it("returns logs for an incident, and none for an unknown one", async () => {
    const logs = await api.listLogs("INC-1042");
    expect(logs.length).toBe(3);
    expect(logs.every((log) => log.incidentId === "INC-1042")).toBe(true);
    expect(await api.listLogs("INC-9999")).toEqual([]);
  });

  it("never fakes a real investigation start", async () => {
    await expect(api.startInvestigation("INC-1042")).rejects.toThrow();
  });
});
