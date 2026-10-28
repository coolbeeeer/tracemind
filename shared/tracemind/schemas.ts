/**
 * Zod schemas for TraceMind actions. These mirror shared/tracemind/models.ts
 * exactly, so an action's output contract cannot drift from the UI contract
 * without a compile error. Keep this file pure — no React, no I/O.
 */
import { z } from "zod";

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(["gcp-run", "github", "aws", "other"]),
  status: z.enum(["healthy", "degraded", "down", "unknown"]),
  errorCount: z.number(),
  lastCheckedAt: z.string(),
  monitoringEnabled: z.boolean(),
});

export const serviceHealthSchema = z.object({
  serviceId: z.string(),
  timestamp: z.string(),
  errorRate: z.number(),
  requestCount: z.number(),
  p95LatencyMs: z.number(),
  status: z.enum(["healthy", "degraded", "down", "unknown"]),
});

export const incidentSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
  serviceId: z.string(),
  title: z.string(),
  description: z.string(),
  detectedAt: z.string(),
  status: z.enum(["open", "investigating", "resolved"]),
  investigationStatus: z.enum(["not-started", "running", "completed", "failed"]),
  demo: z.boolean().optional(),
});

export const integrationSchema = z.object({
  id: z.string(),
  provider: z.enum(["gcp-run", "github", "aws", "other"]),
  label: z.string(),
  status: z.enum(["connected", "not-connected", "coming-soon"]),
  connectedAt: z.string().optional(),
  note: z.string().optional(),
});

export const logEntrySchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  timestamp: z.string(),
  level: z.enum(["error", "warn", "info"]),
  message: z.string(),
  traceId: z.string().optional(),
  serviceId: z.string(),
});

export const agentActionSchema = z.object({
  id: z.string(),
  investigationId: z.string(),
  tool: z.string(),
  input: z.string(),
  output: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export const hypothesisSchema = z.object({
  id: z.string(),
  investigationId: z.string(),
  title: z.string(),
  confidence: z.number(),
  evidenceIds: z.array(z.string()),
});

export const fixSchema = z.object({
  id: z.string(),
  investigationId: z.string(),
  title: z.string(),
  description: z.string(),
  diff: z.string().optional(),
  approved: z.boolean(),
});

export const investigationSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  status: z.enum(["not-started", "running", "completed", "failed"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  steps: z.array(agentActionSchema),
  hypotheses: z.array(hypothesisSchema),
  fixes: z.array(fixSchema),
  demo: z.boolean().optional(),
});

export const deploymentSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  version: z.string(),
  deployedAt: z.string(),
  status: z.string(),
});
