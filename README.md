# TraceMind — Autonomous AI Incident Detection & Investigation Platform

> "Your AI engineer that never stops watching."

TraceMind is an entry for the Builder.io Agent-Native Hackathon. It is an
AI-powered developer platform that, when complete, will continuously monitor
connected applications, detect errors automatically, investigate their root
causes, and recommend solutions — without developers copying and pasting logs.

**Phase 1 status: foundation only.** This repo currently contains the
official Agent-Native scaffold, a dark-first design system, the Overview
Dashboard, shared TypeScript models, a replaceable API layer, and five
deterministic read actions. All data on the Overview page is labelled demo
data. No live cloud monitoring, no GitHub analysis, no AI investigation
logic, and no OAuth flow exists yet. See `docs/agent-native-status.md`
for the honest implemented-vs-planned table.

## Run locally

Prerequisites: Node.js 22.22 or later, pnpm.

```bash
cd tracemind
pnpm install
pnpm dev
```

Sign in with a local dev account when prompted (the template's local
development flow), then open **Overview** in the sidebar. The Overview
Dashboard is the authenticated home (`homePath: "/overview"`); the template
Get started page stays at `/home` and agent chat stays at `/chat`.

Verify after changes, in this order:

```bash
pnpm typecheck
pnpm agent-native:doctor
```

Do not use plain `pnpm doctor` — that runs pnpm's own command, not
Agent-Native Doctor.

## Demo mode

Demo mode is the default in Phase 1 and is clearly labelled on the page
with a DEMO badge and banner. The demo dataset lives in
`shared/tracemind/demo-data.ts` and is returned by the actions in
`actions/list-*.ts` and `actions/get-service-health.ts`. Every demo row
that the models allow to carry it has `demo: true`.

To switch to a real backend later, replace the adapter in
`app/lib/tracemind/api.ts` (see the comment there) and make the actions
delegate to the real store. Do not change components to switch modes.

## What is NOT real yet

- No Google Cloud Logging ingestion, no GitHub repository analysis.
- No AI root-cause investigation. `startInvestigation` is not implemented;
  the mock API throws `BackendNotConnectedError` rather than faking a run.
- No OAuth. Integration connection UI in Phase 3 will be backend-gated
  and will never store credentials in the browser.
- No automated production fixes and no deployment automation.

## Structure

```
app/routes/overview.tsx        Overview Dashboard (Phase 1, functional)
app/components/tracemind/      Dashboard components (badges, cards, sparkline)
app/lib/tracemind/             API interface, mock + HTTP adapters, formatting
shared/tracemind/              Models, demo dataset, action output schemas
actions/                       list-services, list-incidents, get-service-health,
                               list-investigations, list-deployments (+ template actions)
docs/                          architecture, backend contracts, Agent-Native status
```

## Documentation for the backend developer

- `docs/architecture.md` — layers, folder structure, scope locks.
- `docs/backend-contracts.md` — endpoints and request/response contracts.
- `docs/agent-native-status.md` — what Agent-Native provides here, what is
  still backend work, and what must never be faked.

## Framework credit

Built on the official Agent-Native framework (Builder.io), React Router v8,
React 19, Vite, and TailwindCSS. The scaffold is the standalone chat
template (`@agent-native/core@0.221.0`). Framework docs:
https://www.agent-native.com/docs/
