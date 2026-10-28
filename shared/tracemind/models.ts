/**
 * TraceMind shared data models — Phase 1 contract.
 *
 * These types are the single contract between the React UI, the
 * Agent-Native actions, and the future backend. They contain no mock data
 * and no UI code, so the backend developer can implement against them
 * without touching a component.
 *
 * Timestamps are ISO 8601 strings in UTC. The UI formats them for display
 * in the viewer's timezone; it never stores a display string as data.
 */

export type ServiceProvider = "gcp-run" | "github" | "aws" | "other";

export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export type Severity = "critical" | "warning" | "info";

export type IncidentStatus = "open" | "investigating" | "resolved";

export type InvestigationStatus =
  | "not-started"
  | "running"
  | "completed"
  | "failed";

export type AgentActionStatus = "pending" | "running" | "completed" | "failed";

export type IntegrationStatus = "connected" | "not-connected" | "coming-soon";

export interface Service {
  id: string;
  name: string;
  provider: ServiceProvider;
  status: ServiceStatus;
  /** Errors counted in the current demo / reporting window. */
  errorCount: number;
  /** ISO 8601 UTC timestamp of the last health check. */
  lastCheckedAt: string;
  monitoringEnabled: boolean;
}

export interface ServiceHealth {
  serviceId: string;
  /** ISO 8601 UTC timestamp for this point. */
  timestamp: string;
  /** Errors per 1,000 requests, as a percentage number (e.g. 2.5 = 2.5%). */
  errorRate: number;
  requestCount: number;
  /** 95th percentile latency in milliseconds. */
  p95LatencyMs: number;
  status: ServiceStatus;
}

export interface Incident {
  id: string;
  severity: Severity;
  serviceId: string;
  title: string;
  description: string;
  /** ISO 8601 UTC timestamp when the incident was detected. */
  detectedAt: string;
  status: IncidentStatus;
  investigationStatus: InvestigationStatus;
  /** True only for demo-mode rows. Real backend rows must set this false. */
  demo?: boolean;
}

export interface LogEntry {
  id: string;
  incidentId: string;
  /** ISO 8601 UTC timestamp. */
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  traceId?: string;
  serviceId: string;
}

export interface AgentAction {
  id: string;
  investigationId: string;
  /** The tool / action name, e.g. "list-logs". Never a free-text claim. */
  tool: string;
  input: string;
  output?: string;
  status: AgentActionStatus;
  startedAt: string;
  completedAt?: string;
}

export interface RootCauseHypothesis {
  id: string;
  investigationId: string;
  title: string;
  /** 0–100, as reported by the investigation, not a UI guess. */
  confidence: number;
  evidenceIds: string[];
}

export interface FixRecommendation {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  /** Unified diff text, when a code change is proposed. Absent otherwise. */
  diff?: string;
  approved: boolean;
}

export interface Investigation {
  id: string;
  incidentId: string;
  status: InvestigationStatus;
  startedAt: string;
  completedAt?: string;
  steps: AgentAction[];
  hypotheses: RootCauseHypothesis[];
  fixes: FixRecommendation[];
  /** True only for demo-mode investigations. See docs/agent-native-status.md. */
  demo?: boolean;
}

export interface Integration {
  id: string;
  provider: ServiceProvider;
  label: string;
  status: IntegrationStatus;
  connectedAt?: string;
  /** Human-readable note, e.g. why a provider is coming soon. */
  note?: string;
}
