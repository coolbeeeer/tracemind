/**
 * TraceMind API abstraction layer — Phase 1.
 *
 * UI code imports ONLY this interface (and the models). It never imports
 * demo data directly and never calls fetch() against a backend URL.
 *
 * - MockTraceMindApi: Phase 1 demo adapter. Returns the labelled demo
 *   dataset from shared/tracemind/demo-data.ts. All rows it returns
 *   carry demo: true where the model allows it.
 * - HttpTraceMindApi: the contract for the real backend. Until a backend
 *   is connected it throws BackendNotConnectedError on every call —
 *   it never fakes a success, a service, or an investigation.
 *
 * Switching from demo to real is a one-line change in the adapter
 * selection below, plus a real base URL. No component changes.
 */

import {
  demoDeployments,
  demoHealth,
  demoIncidents,
  demoIntegrations,
  demoInvestigations,
  demoLogs,
  demoServices,
} from "../../../shared/tracemind/demo-data.js";
import type {
  Incident,
  Integration,
  Investigation,
  LogEntry,
  Service,
  ServiceHealth,
} from "../../../shared/tracemind/models.js";

export class BackendNotConnectedError extends Error {
  constructor() {
    super(
      "TraceMind backend is not connected yet. This is Phase 1 demo mode; wire HttpTraceMindApi to a real backend before expecting live data.",
    );
    this.name = "BackendNotConnectedError";
  }
}

export interface IncidentFilter {
  severity?: string;
  status?: string;
  query?: string;
}

export interface Deployment {
  id: string;
  serviceId: string;
  version: string;
  deployedAt: string;
  status: string;
}

export interface TraceMindApi {
  listServices(): Promise<Service[]>;
  getServiceHealth(serviceId: string): Promise<ServiceHealth[]>;
  listIncidents(filter?: IncidentFilter): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | null>;
  listLogs(incidentId: string): Promise<LogEntry[]>;
  listInvestigations(): Promise<Investigation[]>;
  getInvestigation(id: string): Promise<Investigation | null>;
  listIntegrations(): Promise<Integration[]>;
  listDeployments(): Promise<Deployment[]>;
  /**
   * Phase 5 only, backend-gated. In demo mode this must NOT be faked:
   * the mock throws, so no UI can present a demo run as a real one.
   */
  startInvestigation(incidentId: string): Promise<Investigation>;
}

function applyIncidentFilter(
  incidents: Incident[],
  filter?: IncidentFilter,
): Incident[] {
  if (!filter) return incidents;
  const query = filter.query?.trim().toLowerCase();
  return incidents.filter((incident) => {
    if (filter.severity && incident.severity !== filter.severity) return false;
    if (filter.status && incident.status !== filter.status) return false;
    if (query) {
      const haystack =
        `${incident.id} ${incident.title} ${incident.description}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export class MockTraceMindApi implements TraceMindApi {
  async listServices(): Promise<Service[]> {
    return demoServices;
  }

  async getServiceHealth(serviceId: string): Promise<ServiceHealth[]> {
    return demoHealth.filter((point) => point.serviceId === serviceId);
  }

  async listIncidents(filter?: IncidentFilter): Promise<Incident[]> {
    return applyIncidentFilter(demoIncidents, filter);
  }

  async getIncident(id: string): Promise<Incident | null> {
    return demoIncidents.find((incident) => incident.id === id) ?? null;
  }

  async listLogs(incidentId: string): Promise<LogEntry[]> {
    return demoLogs.filter((log) => log.incidentId === incidentId);
  }

  async listInvestigations(): Promise<Investigation[]> {
    return demoInvestigations;
  }

  async getInvestigation(id: string): Promise<Investigation | null> {
    return (
      demoInvestigations.find((investigation) => investigation.id === id) ??
      null
    );
  }

  async listIntegrations(): Promise<Integration[]> {
    return demoIntegrations;
  }

  async listDeployments(): Promise<Deployment[]> {
    return demoDeployments;
  }

  async startInvestigation(_incidentId: string): Promise<Investigation> {
    throw new BackendNotConnectedError();
  }
}

export class HttpTraceMindApi implements TraceMindApi {
  constructor(private readonly baseUrl: string) {}

  private fail(): never {
    throw new BackendNotConnectedError();
  }

  async listServices(): Promise<Service[]> {
    void this.baseUrl;
    this.fail();
  }

  async getServiceHealth(_serviceId: string): Promise<ServiceHealth[]> {
    this.fail();
  }

  async listIncidents(_filter?: IncidentFilter): Promise<Incident[]> {
    this.fail();
  }

  async getIncident(_id: string): Promise<Incident | null> {
    this.fail();
  }

  async listLogs(_incidentId: string): Promise<LogEntry[]> {
    this.fail();
  }

  async listInvestigations(): Promise<Investigation[]> {
    this.fail();
  }

  async getInvestigation(_id: string): Promise<Investigation | null> {
    this.fail();
  }

  async listIntegrations(): Promise<Integration[]> {
    this.fail();
  }

  async listDeployments(): Promise<Deployment[]> {
    this.fail();
  }

  async startInvestigation(_incidentId: string): Promise<Investigation> {
    this.fail();
  }
}

/**
 * Phase 1 adapter selection. Demo mode is the default and the only
 * mode that works until a backend URL is configured by the backend
 * developer. When that day comes, replace this line — not the UI:
 *   export const traceMindApi: TraceMindApi = new HttpTraceMindApi("<base-url>");
 */
export const traceMindApi: TraceMindApi = new MockTraceMindApi();
export const isDemoMode = true;
