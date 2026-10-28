# TraceMind Backend Contracts

For the developer implementing the monitoring engine, AI investigation
logic, cloud integrations, and backend services. Phase 1 UI and actions
already follow these shapes; the backend must not invent a second shape.

## Transport rule (framework-correct)

Normal app data flows through Agent-Native actions, not a hand-rolled
REST API. The framework already exposes each action at
`/_agent-native/actions/:name` (GET for reads, POST for writes), plus
MCP, A2A, and CLI surfaces. Do not add `/api/*` CRUD routes for data
that an action can return. Reserve `server/routes/api/` for the
framework exceptions only: multipart uploads, streaming, webhooks,
OAuth callbacks, and public SEO/OG endpoints.

## Existing Phase 1 actions (demo-backed, shape-stable)

| Action | Input | Output |
|---|---|---|
| `list-services` | `{}` | `{ services: Service[], demo: boolean }` |
| `list-incidents` | `{ severity?, status?, query? }` | `{ incidents: Incident[], demo: boolean }` |
| `get-service-health` | `{ serviceId: string }` | `{ health: ServiceHealth[], demo: boolean }` |
| `list-investigations` | `{}` | `{ investigations: Investigation[], demo: boolean }` |
| `list-deployments` | `{}` | `{ deployments: Deployment[], demo: boolean }` |

When the backend lands, each action keeps its name, input, and output
shape and swaps its demo-data source for the real store. The UI does
not change.

## Future actions (not implemented in Phase 1)

| Action | Input | Output | Notes |
|---|---|---|---|
| `get-incident` | `{ id: string }` | `Incident \| null` | Phase 2, incident detail page. |
| `list-logs` | `{ incidentId: string }` | `{ logs: LogEntry[], demo: boolean }` | Phase 2, investigation workspace. |
| `update-incident-status` | `{ id: string, status: IncidentStatus }` | `Incident` | Phase 2. One patch action per resource; validate the transition server-side. |
| `start-investigation` | `{ incidentId: string }` | `Investigation` | **Phase 5 only.** Must call the real investigation engine. Must never return synthetic steps as if they were agent output. If the engine is unavailable, fail honestly with an error, not a demo record. |
| `list-integrations` | `{}` | `{ integrations: Integration[] }` | Phase 3. Connection itself is backend-gated OAuth; never accept or store a credential from the browser. |

## Model contracts

All models live in `shared/tracemind/models.ts`; all action output
schemas live in `shared/tracemind/schemas.ts`. Key rules:

- Timestamps: ISO 8601 UTC strings. The UI formats them; the backend
  never sends display strings as data.
- Ids: stable strings. Incident ids in the demo are `INC-1042` style;
  the backend may use UUIDs, but must keep one id format per resource.
- `demo` flag: real backend rows must set `demo: false` or omit it.
  Only the demo dataset sets `demo: true`.
- Error counts and rates: `errorCount` is a count in the reporting
  window; `errorRate` is a percentage number (2.5 means 2.5%).
- Logs: reference by `traceId` and `serviceId`; never embed large
  payloads, screenshots, or base64 blobs in a row — store references.
- Fixes: a `FixRecommendation` with a `diff` is a proposal, not an
  applied change. `approved: false` until a human approves it in the
  workspace (Phase 2/5). No action in Phase 1–4 may apply a fix.

## Integration contracts (Phase 3, backend-owned)

- Google Cloud Run: the backend owns Cloud Logging ingestion and the
  service health computation. The UI only renders `Service`,
  `ServiceHealth`, and `Incident` rows it returns.
- GitHub: the backend owns repository reads and code inspection. The
  UI only renders evidence and diffs it returns, with source file and
  line references, never a claimed code path it did not receive.
- AWS and other providers: `Integration.status = "coming-soon"` until
  a backend provider exists. The UI must not render a Connect button
  that pretends to connect a coming-soon provider.

## Security rules

- No API keys, tokens, webhook URLs, signing secrets, or customer data
  in code, examples, logs, or action outputs. Use the framework's
  secrets / scoped credential resolvers and obvious placeholders.
- OAuth callbacks live under `server/routes/api/` only when the
  backend implements them; Phase 1–2 UI must not simulate an OAuth
  redirect, a token, or a "connected" state for a provider that is not
  connected.
- Every write action validates authorization and the state transition
  server-side. UI state alone is never a security check.
