# TraceMind — Agent-Native Status (honest, Phase 1)

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

## What is NOT implemented (and must not be faked)

| Piece | Status | When |
|---|---|---|
| Investigation agent (LLM, tool loop, root-cause reasoning) | Not built | Phase 5, with a real LLM route (NVIDIA free key is the current first candidate, re-tested at that time) |
| `start-investigation` action | Not built; mock throws `BackendNotConnectedError` | Phase 5 |
| Cloud Logging ingestion (Google Cloud Run) | Not built | Backend developer, Phase 3+ |
| GitHub repository analysis / code inspection | Not built | Backend developer, Phase 3+ |
| OAuth for Google Cloud / GitHub | Not built, no fake flow | Backend developer, Phase 3 |
| Automated fixes / deployment automation | Explicitly out of scope | Separate work, never in this hackathon entry without human approval |
| Services, Incidents, Investigation, Integrations, Agent Activity, Settings pages | Not built as functional pages | Phases 2–3 |
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
