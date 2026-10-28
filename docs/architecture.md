# TraceMind — Phase 1 Architecture and Folder Structure
Status: PROPOSED, 2026-10-28. Official Agent-Native scaffold is running in the background; the folder tree below will be verified against the generated tree before Phase 1 is called done. No code has been pushed to GitHub yet.

## Decision: Gig Scout is parked, TraceMind is the new entry
The earlier Builder.io plan (Gig Scout, 8.4/10) is parked, not deleted. TraceMind replaces it as the hackathon entry, with the same deadline: submit by 9 Nov 2026, 11:59 PM PT = 10 Nov 2026, 1:29 PM IST. TraceMind's full 7-page scope is larger than Gig Scout's, so Phase 1 is deliberately only the foundation. The full product cannot honestly be promised in 12 days without cutting scope; Phases 2–5 below are the remaining work, not a Phase 1 promise.

## Phase 1 scope — and only Phase 1
Build:
- Official Agent-Native standalone chat-template scaffold, unmodified framework core
- TraceMind brand, dark-first design system, layout shell, navigation
- Overview Dashboard working against the API layer (demo data, clearly labelled)
- Shared TypeScript models and a replaceable API abstraction layer
- Documentation: README, architecture, backend contracts, Agent-Native status

Do NOT build in Phase 1:
- Services, Incidents, Investigation, Integrations, Agent Activity, Settings pages as functional pages (those are Phases 2–3; their routes in Phase 1 show scope and contracts only, no fake functionality)
- Production monitoring workers, Cloud Logging ingestion, GitHub analysis, AI root-cause logic, automated fixes, deployment automation
- Any OAuth flow, fake or real. Integration connection UI in later phases must be backend-gated and must never store credentials in the browser.
- Any claim that demo investigations are real. Demo data is labelled DEMO everywhere it appears.

## Verified technology baseline
From the official Agent-Native docs and the generated chat template (same template family as the reference app on this machine):
- Framework: @agent-native/core + React Router v8 (framework mode), Nitro backend
- Frontend: React 19, Vite, TailwindCSS, shadcn/ui primitives
- Routing: file-based via flatRoutes(), SSR shell + client rendering; normal app data is fetched on the client via action hooks
- Backend state: SQL-backed, PGlite locally, PostgreSQL in production, SSE for live updates
- Agent surface: AgentKit chat on the template home route, with actions in actions/ as the shared tool layer
- Commands (generated manifest, to be verified): pnpm dev, pnpm build, pnpm typecheck, pnpm agent-native:doctor
- Environment on this machine: Node v24.22.1 (docs require 22.22+), pnpm 10.14.0 installed for this build (matches the reference app's packageManager)

## Architecture — layers, in one direction
```
React pages (app/routes/*)
  -> reusable components (app/components/*)
  -> TraceMind API interface (app/lib/api/client.ts)
       -> Mock adapter (Phase 1, demo data, labelled DEMO)
       -> HTTP adapter (later, real backend; until connected it must fail honestly, not fake success)
  -> Agent-Native actions (actions/*)
       -> deterministic read actions in Phase 1 (list services, list incidents)
       -> investigation actions in Phase 5 ONLY, backed by the real backend + LLM
  -> SQL / backend services (later, separate developer's scope)
```

Rules that keep the later backend swap cheap:
1. UI components never import mock data directly. They import only the API interface and the models.
2. Actions are the framework's shared surface: one defineAction() definition is callable from the React UI, the agent, HTTP, MCP, A2A and CLI. No second implementation of the same operation.
3. Application state (navigation, selected service/incident) lives in the framework's application-state mechanism, not in ad-hoc component state that the agent cannot see.
4. Large payloads (logs, diffs, replay chunks) are referenced by id/URL, never embedded as base64 in SQL or application state.
5. Never hardcode keys, tokens, webhook URLs or secrets. Examples use obvious placeholders only.

## Proposed folder structure
```
tracemind/
  agent-native.config.ts        # framework config, TraceMind brand in server/plugins/config.ts
  agent-native.json             # scaffold metadata (standalone, chat template)
  package.json                  # generated manifest, installed as written, versions pinned
  pnpm-lock.yaml / pnpm-workspace.yaml
  react-router.config.ts
  vite.config.ts
  tsconfig.json
  app/
    root.tsx                    # HTML shell, providers, demo-mode banner slot
    entry.client.tsx / entry.server.tsx
    routes.ts                   # flatRoutes()
    routes/
      _index.tsx                # Overview Dashboard (Phase 1, functional)
      services.tsx              # Phase 2
      incidents.tsx             # Phase 2
      investigations.tsx        # Phase 2 (workspace shell)
      investigations.$id.tsx    # Phase 2 (detail)
      integrations.tsx          # Phase 3, backend-gated, no fake OAuth
      activity.tsx              # Phase 3
      settings.tsx              # Phase 3
    components/
      layout/                   # AppShell, Sidebar, Topbar, DemoBanner
      ui/                       # Button, Card, Badge, Table, Tabs, Skeleton, EmptyState
      dashboard/                # StatCard, HealthChart, IncidentRow, DeploymentRow
      incidents/                # (Phase 2) SeverityBadge, StatusFilter
      investigation/            # (Phase 2) Timeline, EvidenceCard, FixCard
    design-system.ts            # tokens: near-black, emerald AI accent, red/amber severity
    global.css                  # Tailwind + tokens + typography
    hooks/                      # useTraceMindApi, useDemoMode
    lib/
      models.ts                 # shared models (see below)
      api/
        client.ts               # TraceMindApi interface
        mock.ts                 # MockTraceMindApi, DEMO-labelled synthetic data
        http.ts                 # HttpTraceMindApi stub, honest failure until backend lands
      demo/                     # demo dataset builders, clearly separated from real code
  actions/
    hello.ts                    # template action, retained until replaced
    list-services.ts            # Phase 1, deterministic read via API layer
    list-incidents.ts           # Phase 1, deterministic read via API layer
    get-incident.ts             # Phase 2
    start-investigation.ts     # Phase 5 ONLY, backend-gated, no simulated tool execution
    run.ts                      # script dispatcher (template)
  server/
    plugins/config.ts           # app.name = TraceMind, brand
    routes/api/                 # later: webhooks, OAuth callbacks (backend developer)
  shared/                       # isomorphic code shared by client and server
  drizzle/                      # later, when real persistence lands
  public/
  docs/
    architecture.md             # this document, copied into the repo
    backend-contracts.md        # endpoints + request/response contracts
    agent-native-status.md      # implemented vs backend-required, honestly labelled
  README.md                     # install, dev, demo mode, what is NOT real yet
  .env.example                  # placeholders only, no secrets
```

Phase 1 routes that are not yet functional will NOT be decorative buttons: they will render a scope page stating the phase, the models, and the contract, with no fake data and no action button that pretends to work.

## Shared TypeScript models (Phase 1 contract)
```ts
Service { id, name, provider: 'gcp-run' | 'github' | 'aws' | 'other',
  status: 'healthy' | 'degraded' | 'down' | 'unknown',
  errorCount, lastCheckedAt, monitoringEnabled }
ServiceHealth { serviceId, timestamp, errorRate, requestCount, p95LatencyMs, status }
Incident { id, severity: 'critical' | 'warning' | 'info',
  serviceId, title, description, detectedAt, status: 'open' | 'investigating' | 'resolved',
  investigationStatus: 'not-started' | 'running' | 'completed' | 'failed' }
LogEntry { id, incidentId, timestamp, level, message, traceId?, serviceId }
Investigation { id, incidentId, status, startedAt, completedAt?,
  steps: AgentAction[], hypotheses: RootCauseHypothesis[], fixes: FixRecommendation[] }
AgentAction { id, investigationId, tool, input, output?, status, startedAt, completedAt? }
RootCauseHypothesis { id, investigationId, title, confidence, evidenceIds: string[] }
FixRecommendation { id, investigationId, title, description, diff?, approved: boolean }
Integration { id, provider, status: 'connected' | 'not-connected' | 'coming-soon',
  connectedAt?, note }
```

## API abstraction layer (Phase 1 contract)
```ts
interface TraceMindApi {
  listServices(): Promise<Service[]>;
  getServiceHealth(serviceId: string): Promise<ServiceHealth[]>;
  listIncidents(filter?: { severity?: string; status?: string; query?: string }): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | null>;
  listLogs(incidentId: string): Promise<LogEntry[]>;
  listInvestigations(): Promise<Investigation[]>;
  getInvestigation(id: string): Promise<Investigation | null>;
  listAgentActivity(): Promise<AgentAction[]>;
  listIntegrations(): Promise<Integration[]>;
  updateIncidentStatus(id: string, status: Incident['status']): Promise<Incident>;
  // Phase 5 only, backend-gated:
  startInvestigation(incidentId: string): Promise<Investigation>;
}
```
MockTraceMindApi implements the read methods with labelled demo data. updateIncidentStatus in demo mode mutates only the demo store and is labelled as such. startInvestigation in Phase 1 is NOT implemented and must not be faked; in Phase 5 it will call the real backend action.

## Agent-Native integration — honest status table
| Piece | Phase 1 status | Notes |
|---|---|---|
| Official scaffold (chat template, standalone) | Implementing now | Framework core unmodified |
| defineAction() shared actions | Read actions only | list-services, list-incidents, deterministic, no LLM |
| AgentKit chat surface | Template default, retained | Not rebranded as TraceMind investigation yet |
| Investigation agent (LLM, tools, GitHub/Cloud reads) | NOT built | Phase 5, needs backend + LLM route (NVIDIA free key is the current first candidate, re-tested at build time) |
| Google Cloud Run / GitHub integrations | NOT built | Phase 3 UI is backend-gated; no fake OAuth, no browser credential storage |
| Production monitoring / fixes | Explicitly out of scope | Separate developer, per the brief |

## Design tokens (Phase 1)
- Background: near-black (#0A0C10 family), panels #11141B, borders #1E2430
- Text: primary #E6EAF2, muted #8B94A7
- AI accent: emerald #10B981, used only for agent actions and AI surfaces
- Severity: critical red #EF4444, warning amber #F59E0B, healthy emerald/green, info slate
- Type: Inter or system sans for UI, JetBrains Mono for logs/code
- Charts: lightweight custom SVG sparklines/bars in Phase 1; no chart library until a real trend requirement lands
- Motion: subtle, 150–200 ms, no layout-shifting animations

## Phases after Phase 1 (for planning, not for this turn)
- Phase 2: Services, Incidents, Investigation Workspace (read + demo, no real investigation logic)
- Phase 3: Integrations (backend-gated), Agent Activity, Settings
- Phase 4: Mock adapter hardening, demo mode polish, Clips demo script, submission dry run
- Phase 5: Real Agent-Native investigation actions, wired to the backend developer's endpoints + LLM route, with human approval before any proposed action

## GitHub — blocked on two confirmations, no push yet
1. Account: past work on this machine is under GitHub account coolbeeeer (repos coolbeeeer/curv, coolbeeeer/narrative-sniper); author name on other platforms is Coolbeer. Confirm the push target is coolbeeeer/tracemind (or give a different repo name).
2. Author name for commits: confirm whether to use coolbeeeer, Coolbeer, or another name.
Until both are confirmed, Phase 1 stays local in ~/workspace/tracemind. The earlier GitHub push helper on this machine (~/workspace/skills/github/bin/gh-push, Secure Vault token) is the route to use when pushing, not a pasted token in chat.
