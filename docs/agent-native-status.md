# TraceMind — Agent-Native Status (honest, Phases 1–2 Chunk 1)

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
| Investigation, Integrations, Agent Activity, Settings pages | Not built as functional pages | Phase 2 Chunk 2, Phase 3 |
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
