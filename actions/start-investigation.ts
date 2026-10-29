import { defineAction } from "@agent-native/core/action";
import type { ActionRunContext } from "@agent-native/core/action";
import { resolveCredential } from "@agent-native/core/credentials";
import { z } from "zod";

import { investigationSchema } from "../shared/tracemind/schemas.js";
import { createIncidentStore } from "../server/tracemind/monitoring/incident-store.js";
import { createInvestigationStore } from "../server/tracemind/investigation/investigation-store.js";
import { tryAcquireInvestigationLock } from "../server/tracemind/investigation/investigation-lock.js";
import { investigateStoredIncident } from "../server/tracemind/investigation/investigate-stored-incident.js";

/**
 * Server-configured owner allowlist for the single-owner hackathon
 * deployment. Set TRACEMIND_OWNER_EMAILS to the owner's email address
 * (comma-separated if more than one owner). This is configuration,
 * not a credential, and it is never read from caller input.
 *
 * This is explicitly a single-owner control, not a multi-tenant
 * access model: it proves the caller is an owner, and run() then
 * proves the incident is a live database row. It does not prove a
 * per-incident ownership relationship, because incidents carry no
 * owner or tenant field. A multi-tenant deployment must add that
 * field and enforce it before using this action.
 */
export function ownerAllowlist(): string[] {
  // guard:allow-env-credential — owner email allowlist is deployment configuration, not a credential; emails are identifiers, not secrets, and are never returned in output. Backend owner to review.
  return (process.env.TRACEMIND_OWNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwner(userEmail?: string): boolean {
  if (!userEmail) return false;
  return ownerAllowlist().includes(userEmail.trim().toLowerCase());
}

/**
 * Authorization gate for the investigation trigger. An authenticated
 * identity alone is not enough: the caller must be an owner on the
 * server-configured allowlist. If the allowlist is unset, nobody is
 * authorized (fail closed). Incident-level authorization happens in
 * run(): the incident must exist in the configured database, must
 * not be a demo incident, and must not already have a completed
 * investigation. Without a database row, there is nothing to
 * authorize against, so the call is refused before any model call
 * or credential use.
 */
export function authorizeStartInvestigation(
  _args: { incidentId: string },
  ctx?: ActionRunContext,
): boolean {
  return isOwner(ctx?.userEmail);
}

/**
 * Start (or return the existing) investigation for one live incident.
 *
 * Safety properties, enforced server-side:
 * - Requires authentication (requiresAuth + authorize above).
 * - Accepts only an incidentId. No model key, database URL, GitHub
 *   token, or other credential is accepted from the caller; model and
 *   database credentials come from server environment only and are
 *   never returned in the output.
 * - Demo incidents are refused; only incidents persisted in the
 *   configured database can be investigated.
 * - Duplicate protection: a completed investigation is returned
 *   without a new model call, and a per-incident advisory lock held
 *   for the whole run makes a concurrent second call fail instead of
 *   starting a duplicate paid run.
 * - needsApproval: the agent loop must get human approval before this
 *   paid, non-idempotent-by-default call runs.
 * - Model credential: resolved through the framework credential vault
 *   for the authenticated caller, never from process.env and never
 *   from caller input. The database URL remains the deploy-level
 *   allowlisted key used by the existing live read actions.
 */
export default defineAction({
  description:
    "Start an evidence-backed investigation for one live incident, or return its existing completed investigation. Requires authentication; never accepts credentials from the caller.",
  schema: z.object({
    incidentId: z.string().min(1),
  }),
  outputSchema: z.object({
    investigation: investigationSchema,
    started: z.boolean(),
    demo: z.literal(false),
  }),
  http: { method: "POST" },
  requiresAuth: true,
  authorize: authorizeStartInvestigation,
  needsApproval: true,
  run: async ({ incidentId }, ctx) => {
    // Defense in depth: the framework enforces authorize() before
    // run(), but run() must not trust that alone.
    if (!isOwner(ctx?.userEmail)) {
      throw new Error("Not authorized");
    }
    const databaseUrl = process.env.DATABASE_URL;
    const openaiApiKey = ctx?.userEmail
      ? await resolveCredential("OPENAI_API_KEY", {
          userEmail: ctx.userEmail,
          ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
        })
      : undefined;
    if (!databaseUrl || !openaiApiKey) {
      throw new Error("Server credentials are required");
    }
    const incidents = createIncidentStore(databaseUrl);
    const investigations = createInvestigationStore(databaseUrl);
    try {
      const incident = await incidents.getIncident(incidentId);
      if (!incident || incident.demo) {
        throw new Error("Incident not found or not investigable");
      }
      const existing = await investigations.listForIncident(incidentId);
      const completed = existing.find((item) => item.status === "completed");
      if (completed) {
        return { investigation: completed, started: false, demo: false as const };
      }
      const lock = await tryAcquireInvestigationLock(databaseUrl, incidentId);
      try {
        if (!lock.acquired) {
          throw new Error("Investigation already in progress for this incident");
        }
        // Re-check inside the lock: the first run may have finished
        // between the pre-check and the lock acquisition.
        const inside = await investigations.listForIncident(incidentId);
        const finished = inside.find((item) => item.status === "completed");
        if (finished) {
          return { investigation: finished, started: false, demo: false as const };
        }
        const result = await investigateStoredIncident({
          databaseUrl,
          incidentId,
          openaiApiKey,
        });
        return { investigation: result, started: true, demo: false as const };
      } finally {
        await lock.release();
      }
    } finally {
      await Promise.all([incidents.close(), investigations.close()]);
    }
  },
});
