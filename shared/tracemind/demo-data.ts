/**
 * TraceMind DEMO dataset — Phase 1 only.
 *
 * Every row here is synthetic. Nothing in this file is a real service,
 * a real incident, or a real agent investigation. The UI must label
 * anything rendered from this file as DEMO, and the backend swap is
 * simply: replace the adapter that reads this file, not the UI.
 *
 * The example incident mirrors the brief: a Spring Boot app on Google
 * Cloud Run returning HTTP 500 errors. It is invented for the demo.
 */

import type {
  Incident,
  Integration,
  Investigation,
  LogEntry,
  Service,
  ServiceHealth,
} from "./models.js";

export const DEMO_MODE_LABEL = "DEMO";

export const demoServices: Service[] = [
  {
    id: "svc-payments-api",
    name: "payments-api",
    provider: "gcp-run",
    status: "down",
    errorCount: 184,
    lastCheckedAt: "2026-10-28T17:42:00Z",
    monitoringEnabled: true,
  },
  {
    id: "svc-orders-api",
    name: "orders-api",
    provider: "gcp-run",
    status: "degraded",
    errorCount: 37,
    lastCheckedAt: "2026-10-28T17:42:00Z",
    monitoringEnabled: true,
  },
  {
    id: "svc-web-frontend",
    name: "web-frontend",
    provider: "gcp-run",
    status: "healthy",
    errorCount: 2,
    lastCheckedAt: "2026-10-28T17:42:00Z",
    monitoringEnabled: true,
  },
  {
    id: "svc-auth-service",
    name: "auth-service",
    provider: "gcp-run",
    status: "healthy",
    errorCount: 0,
    lastCheckedAt: "2026-10-28T17:41:00Z",
    monitoringEnabled: true,
  },
  {
    id: "svc-notifications",
    name: "notifications-worker",
    provider: "aws",
    status: "healthy",
    errorCount: 5,
    lastCheckedAt: "2026-10-28T17:40:00Z",
    monitoringEnabled: false,
  },
  {
    id: "svc-tracemind-repo",
    name: "tracemind (GitHub)",
    provider: "github",
    status: "healthy",
    errorCount: 0,
    lastCheckedAt: "2026-10-28T17:39:00Z",
    monitoringEnabled: true,
  },
];

export const demoHealth: ServiceHealth[] = [
  { serviceId: "svc-payments-api", timestamp: "2026-10-28T17:12:00Z", errorRate: 0.4, requestCount: 4120, p95LatencyMs: 210, status: "healthy" },
  { serviceId: "svc-payments-api", timestamp: "2026-10-28T17:22:00Z", errorRate: 1.8, requestCount: 3980, p95LatencyMs: 340, status: "degraded" },
  { serviceId: "svc-payments-api", timestamp: "2026-10-28T17:32:00Z", errorRate: 12.6, requestCount: 3610, p95LatencyMs: 890, status: "down" },
  { serviceId: "svc-payments-api", timestamp: "2026-10-28T17:42:00Z", errorRate: 18.4, requestCount: 3120, p95LatencyMs: 1240, status: "down" },
  { serviceId: "svc-orders-api", timestamp: "2026-10-28T17:12:00Z", errorRate: 0.3, requestCount: 2210, p95LatencyMs: 180, status: "healthy" },
  { serviceId: "svc-orders-api", timestamp: "2026-10-28T17:22:00Z", errorRate: 0.9, requestCount: 2180, p95LatencyMs: 260, status: "degraded" },
  { serviceId: "svc-orders-api", timestamp: "2026-10-28T17:32:00Z", errorRate: 2.1, requestCount: 2050, p95LatencyMs: 410, status: "degraded" },
  { serviceId: "svc-orders-api", timestamp: "2026-10-28T17:42:00Z", errorRate: 2.4, requestCount: 1980, p95LatencyMs: 430, status: "degraded" },
];

export const demoIncidents: Incident[] = [
  {
    id: "INC-1042",
    severity: "critical",
    serviceId: "svc-payments-api",
    title: "HTTP 500 spike on payments-api",
    description:
      "Demo incident: Spring Boot service on Google Cloud Run started returning HTTP 500 errors after the latest deployment. Error rate rose from 0.4% to 18.4% in 30 minutes.",
    detectedAt: "2026-10-28T17:32:00Z",
    status: "investigating",
    investigationStatus: "running",
    demo: true,
  },
  {
    id: "INC-1041",
    severity: "warning",
    serviceId: "svc-orders-api",
    title: "Elevated latency on orders-api",
    description:
      "Demo incident: p95 latency rose from 180 ms to 430 ms. No error spike yet; the service is degraded, not down.",
    detectedAt: "2026-10-28T17:18:00Z",
    status: "open",
    investigationStatus: "not-started",
    demo: true,
  },
  {
    id: "INC-1040",
    severity: "info",
    serviceId: "svc-web-frontend",
    title: "Two isolated 500s on web-frontend",
    description:
      "Demo incident: two isolated errors, below the alert threshold. Kept for history, not paged.",
    detectedAt: "2026-10-28T16:05:00Z",
    status: "resolved",
    investigationStatus: "completed",
    demo: true,
  },
];

export const demoLogs: LogEntry[] = [
  {
    id: "log-1",
    incidentId: "INC-1042",
    timestamp: "2026-10-28T17:31:12Z",
    level: "error",
    message:
      "Demo log: NullPointerException in PaymentService.charge() — payment method token was null for order ORD-9912.",
    traceId: "trace-demo-1042-a",
    serviceId: "svc-payments-api",
  },
  {
    id: "log-2",
    incidentId: "INC-1042",
    timestamp: "2026-10-28T17:31:40Z",
    level: "error",
    message:
      "Demo log: HTTP 500 returned for POST /v1/payments — upstream timeout after 30s, retry exhausted.",
    traceId: "trace-demo-1042-b",
    serviceId: "svc-payments-api",
  },
  {
    id: "log-3",
    incidentId: "INC-1042",
    timestamp: "2026-10-28T17:32:05Z",
    level: "warn",
    message:
      "Demo log: orders-api reported downstream failures for payments-api, 14 requests in 60s.",
    traceId: "trace-demo-1042-b",
    serviceId: "svc-orders-api",
  },
];

export const demoInvestigations: Investigation[] = [
  {
    id: "inv-1042",
    incidentId: "INC-1042",
    status: "running",
    startedAt: "2026-10-28T17:33:00Z",
    steps: [
      {
        id: "step-1",
        investigationId: "inv-1042",
        tool: "list-logs",
        input: "incident INC-1042, last 30 minutes",
        output: "Demo output: 184 errors, 2 distinct stack traces.",
        status: "completed",
        startedAt: "2026-10-28T17:33:00Z",
        completedAt: "2026-10-28T17:33:40Z",
      },
      {
        id: "step-2",
        investigationId: "inv-1042",
        tool: "correlate-errors",
        input: "trace-demo-1042-a, trace-demo-1042-b",
        output: "Demo output: both traces share the payments deploy at 17:28 UTC.",
        status: "completed",
        startedAt: "2026-10-28T17:33:40Z",
        completedAt: "2026-10-28T17:34:10Z",
      },
      {
        id: "step-3",
        investigationId: "inv-1042",
        tool: "inspect-source",
        input: "PaymentService.charge()",
        status: "running",
        startedAt: "2026-10-28T17:34:10Z",
      },
    ],
    hypotheses: [
      {
        id: "hyp-1",
        investigationId: "inv-1042",
        title: "Demo hypothesis: deployment at 17:28 UTC changed token handling",
        confidence: 72,
        evidenceIds: ["log-1", "log-2"],
      },
    ],
    fixes: [
      {
        id: "fix-1",
        investigationId: "inv-1042",
        title: "Demo suggestion: guard the null token path in PaymentService.charge()",
        description:
          "Demo suggestion only — not a verified fix. A real investigation must confirm the code path before this is applied.",
        approved: false,
      },
    ],
    demo: true,
  },
];

export const demoIntegrations: Integration[] = [
  { id: "int-gcp", provider: "gcp-run", label: "Google Cloud Run", status: "not-connected", note: "Backend-gated in Phase 3. No OAuth flow is implemented in Phase 1." },
  { id: "int-github", provider: "github", label: "GitHub", status: "not-connected", note: "Backend-gated in Phase 3. No OAuth flow is implemented in Phase 1." },
  { id: "int-aws", provider: "aws", label: "AWS", status: "coming-soon", note: "Coming soon, per the brief." },
  { id: "int-other", provider: "other", label: "Other providers", status: "coming-soon", note: "Coming soon, per the brief." },
];

export const demoDeployments = [
  { id: "dep-1", serviceId: "svc-payments-api", version: "v2.14.0", deployedAt: "2026-10-28T17:28:00Z", status: "live" },
  { id: "dep-2", serviceId: "svc-orders-api", version: "v1.9.3", deployedAt: "2026-10-28T15:02:00Z", status: "live" },
  { id: "dep-3", serviceId: "svc-web-frontend", version: "v3.1.1", deployedAt: "2026-10-28T12:44:00Z", status: "live" },
];
