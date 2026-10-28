# TraceMind — Agent-Native Status (honest, Phases 1–3)

## What Agent-Native actually provides here

- Official standalone chat-template scaffold, unmodified framework core
  (`@agent-native/core@0.221.0`, React Router v8, Nitro, PGlite locally).
- Shared action surface: one `defineAction()` definition per operation,
  callable from the React UI (`useActionQuery`), the agent, HTTP, MCP,
  A2A, and CLI. Phase 1 actions are all deterministic reads with a
  declared `outputSchema` and `http: { method: "GET" }`.
- Template agent chat at `/chat`, template Get started page at `/home`,
  and the framework's auth, live sync, and application-state mechanisms.
  These are retained, not rebranded as TraceMind investigation yet.
- TraceMind authenticated home set to `/overview` via
  `server/plugins/agent-native-email-branding.ts` (`homePath`).

## Phase 1 actions (implemented, demo-backed)

`list-services`, `list-incidents`, `get-service-health`,
`list-investigations`, `list-deployments`. Each returns `{ ..., demo: true }`
from `shared/tracemind/demo-data.ts`. No LLM is called by any of them,
and no step in them is an investigation.

## Phase 2 Chunk 1 (implemented, demo-backed, branch `feature/tracemind-frontend`)

- Services: `/services` list with name search and status / provider /
  monitoring filters, plus `/services/:serviceId` detail with monitoring
  history (error rate, requests, p95), deployments, and incidents for
  that service. Filters on the list page are client-side over the
  existing `list-services` data; the action contract is unchanged.
- Incidents: `/incidents` searchable table with severity and status
  filters passed to the existing `list-incidents` action, plus
  `/incidents/:incidentId` detail via the new `get-incident` action.
  Detail shows the incident, affected service, and a demo investigation
  summary; it does not claim a workspace exists yet.
- New action: `get-incident` (GET, demo-backed, returns
  `{ incident: Incident | null, demo: true }`). `shared/tracemind/models.ts`
  and `docs/backend-contracts.md` are untouched in this chunk, per the
  collaboration rules.
- Sidebar: TraceMind section now links Overview, Services, and Incidents,
  with active states for nested detail routes. Overview recent incidents
  now link to their detail pages.

## Phase 2 Chunk 2 (implemented, demo-backed, branch `feature/tracemind-frontend`)

- Investigation Workspace at `/investigations/:investigationId`, with a
  list at `/investigations`. Split-panel layout: left incident details /
  affected service / error-rate chart / related errors / log timeline;
  centre investigation progress / tool execution timeline / hypotheses /
  evidence / suggested fixes with a diff viewer; right agent conversation /
  follow-up requests / approval controls.
- New actions: `get-investigation` (one demo investigation, null if
  unknown) and `list-logs` (demo logs for one incident). `logEntrySchema`
  was added to `shared/tracemind/schemas.ts` to mirror the existing
  `LogEntry` model; no existing schema, model, or contract was changed.
- Demo dataset additions, all labelled DEMO: a synthetic diff on the
  existing demo fix, and a second demo hypothesis with no evidence, so
  the workspace exercises both the evidence-linked and the
  evidence-insufficient states.
- Honesty rules in the workspace: tool steps show their actual action
  names, statuses (pending / running / completed / failed), timestamps,
  and recorded outputs; the conversation panel never claims an agent
  answered — follow-ups are session-only and the system reply says so;
  approvals are demo-only, not persisted, and apply no code change or
  deployment. Real agent conversation, follow-up execution, and approvals
  require the backend developer's investigation agent and approval
  endpoint.
- Incident detail and Overview investigation activity now link to the
  workspace when a demo investigation exists for that incident.

## What is NOT implemented (and must not be faked)

| Piece | Status | When |
|---|---|---|
| Investigation agent (LLM, tool loop, root-cause reasoning) | Not built | Phase 5, with a real LLM route (NVIDIA free key is the current first candidate, re-tested at that time) |
| `start-investigation` action | Not built; mock throws `BackendNotConnectedError` | Phase 5 |
| Cloud Logging ingestion (Google Cloud Run) | Not built | Backend developer, Phase 3+ |
| GitHub repository analysis / code inspection | Not built | Backend developer, Phase 3+ |
| OAuth for Google Cloud / GitHub | Not built, no fake flow | Backend developer, Phase 3 |
| Automated fixes / deployment automation | Explicitly out of scope | Separate work, never in this hackathon entry without human approval |
| Services, Incidents pages | Built in Phase 2 Chunk 1 (demo-backed) | — |
| Investigation Workspace | Built in Phase 2 Chunk 2 (demo-backed) | — |
| Integrations, Agent Activity, Settings pages | Built in Phase 3 Chunk 3 (demo-backed / session-only) | — |

## Phase 3 Chunk 3 (implemented, branch `feature/tracemind-frontend`)

- Integrations at `/integrations`: connection summary (0 connected in
  demo mode), per-provider cards with Disconnected / Unavailable states,
  permission explanations, and a backend-gated Connect button that is
  disabled with a stated reason. No OAuth flow is started, no credential
  is stored, and no connection is claimed active without backend
  confirmation. New action `list-integrations` (demo-backed);
  `integrationSchema` added to schemas to mirror the existing model.
- Agent Activity at `/agent-activity`: investigation runs and tool
  executions derived from the existing demo investigations, with search
  and status / tool / investigation filters, timestamps, durations
  where recorded, and clear empty states (no activity, and no matches
  with a working clear-filters action).
- Settings at `/tracemind-settings`: monitoring configuration,
  notification preferences, and investigation safety controls, all
  session-only with a prominent banner saying so. This route is
  deliberately distinct from the template-owned `/settings`, which is
  untouched. No setting here is persisted or enforced by a backend yet;
  the backend developer's persistence and enforcement endpoints remain
  dependencies.
| Framework `/settings` route | Owned by the template | TraceMind settings in Phase 3 must not overwrite it; use a distinct route or extend it deliberately |

## Demo-mode honesty rules (binding for every phase)

1. Demo rows are labelled DEMO in the UI and carry `demo: true` in data.
2. Demo investigations are synthetic records, not agent output, and the
   Overview page says so in plain text.
3. A demo run is never presented as a live investigation, a live
   service, or a verified fix.
4. If the backend or LLM is unavailable, the action fails honestly
   instead of returning a synthetic success.
5. No credential, token, or secret is ever stored in the browser, in
   demo data, or in an example.
