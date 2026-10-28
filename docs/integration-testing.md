# TraceMind — Integration Testing (frontend ↔ backend store)

Status: **planning and contract tests only, as of 2026-10-29.**
No backend wiring is done in this document's chunk, no migration has
been run, and no production database has been modified. Feature
development is on hold; this file exists so that when wiring lands, the
frontend and the backend store can be checked against each other
without guessing.

## What the backend has (branch `feature/monitoring-engine`, verified read-only)

- `server/tracemind/monitoring/incident-store.ts` — PostgreSQL store
  (`postgres` client, `DATABASE_URL` from server-side secrets only):
  `listIncidents()`, `getIncident(id)`, `listOpenRecords(serviceId)`,
  `upsertRecords(records)`, `listLogs(incidentId)`.
- `server/tracemind/monitoring/schema.sql` — `tracemind_incidents`
  (`id`, `service_id`, `fingerprint`, `status` check
  open/investigating/resolved, `detected_at`, `first_seen_at`,
  `last_seen_at`, `occurrence_count > 0`, `incident jsonb`) with a
  unique index on `(service_id, fingerprint)` where status is not
  resolved, plus `tracemind_logs` with an incident/time index.
- Earlier monitoring work on the same branch: Cloud Run log
  normalisation, error grouping, incident detection, polling
  deduplication, and a read-only Cloud Logging REST collector.
- Shared models (`shared/tracemind/models.ts`) are untouched on the
  backend branch, so the frontend contract is the same contract.

## Contract matrix: frontend actions vs backend store

| Frontend action (demo today) | Backend method that must serve it | Gap to close at wiring time |
|---|---|---|
| `list-services` | No service store yet on the backend branch | Services still demo until a service store lands; do not fake one |
| `list-incidents` (severity / status / query filters) | `listIncidents()` — takes **no** filters | Decide: filter in the action after fetching (as the demo does), or add a filtered store query. Either way, the action's output shape and filter behaviour must not change |
| `get-incident` | `getIncident(id)` — returns `Incident \| null` | Direct match; keep the null → not-found UI behaviour |
| `list-logs` | `listLogs(incidentId)` — up to 500 rows, newest first | Frontend timeline sorts oldest first for display; keep that sort, do not change the store order to suit one page |
| `get-service-health` | No health store yet | Health points still demo until monitoring history lands |
| `list-investigations`, `get-investigation` | No investigation store yet | Investigations still demo until the investigation backend lands |
| `list-deployments` | No deployment store yet | Deployments still demo |
| `list-integrations` | No integration service yet | Integrations stay backend-gated; no OAuth until the backend provides it |
| `start-investigation` | Not built anywhere | Phase 5, backend-gated; the mock must keep throwing, never fake a run |

## Gaps the wiring must not paper over

1. **Status updates.** The store's upsert updates `last_seen_at` and
   `occurrence_count` on conflict, but not `status` or the `incident`
   jsonb. There is currently no store method to resolve or
   re-investigate an incident. The frontend has no status-update
   action today, so nothing breaks — but do not add one until the
   backend provides it.
2. **Incident jsonb must match the schema exactly.** The store casts
   `incident` jsonb directly to `Incident`. Every row the backend
   writes must parse against `incidentSchema` (severity, serviceId,
   title, description, detectedAt, status, investigationStatus).
   A row that fails parsing must fail the action honestly, not be
   silently dropped or coerced.
3. **Demo flag.** Real store rows must carry `demo: false` or omit
   `demo`, so the UI stops showing the DEMO badge for them. Demo rows
   must never be mixed into a real result set without the label.
4. **Fingerprint uniqueness.** The unique index protects against two
   polling workers inserting the same unresolved error. Concurrency
   tests (see below) must exercise two concurrent upserts of the same
   fingerprint and confirm only one unresolved incident survives.
5. **Log volume.** `listLogs` caps at 500 rows. The workspace must
   keep handling the capped case (show the count, do not claim the
   timeline is complete if the cap was hit — that display work is
   still open, and must not be faked).

## Local integration test setup (no production database)

- Run a local PostgreSQL 16 (the same setup used for other local
  Postgres-backed tests on this machine: start the local PG service,
  ensure the `postgres` role has a password, create a throwaway
  database, e.g. `tracemind_test`).
- Apply `schema.sql` from the backend branch to that throwaway
  database only, with the project's normal migration runner when one
  is agreed — do not hand-apply it to any shared or production
  database.
- Point the store at that database via a server-side
  `DATABASE_URL` / `TEST_DATABASE_URL` for the test run only.
  Never put a database URL, password, or token in a committed file,
  a demo dataset, or a chat message.
- Teardown: drop the throwaway database after the run. Tests must
  never touch a production database.

## Test checklist (to run at wiring time, in order)

1. **Schema validation.** Insert one row per incident shape the
   backend can produce, read it back through the store, and parse
   each result with `incidentSchema` / `logEntrySchema`. All must
   pass; any failure blocks wiring.
2. **List / get parity.** Seed the throwaway database with the same
   three demo incidents (as real rows, `demo: false`), wire the
   actions to the store behind a flag, and confirm the Services,
   Incidents, and Workspace pages render the same rows the demo
   pages rendered — counts, severities, statuses, and log counts
   must match exactly.
3. **Filter parity.** With the seeded rows, run `list-incidents`
   with severity, status, and query filters and confirm the results
   match the demo filter behaviour, whichever side implements the
   filtering.
4. **Not-found parity.** Query an unknown incident and investigation
   id and confirm the actions return `null` and the pages show
   their existing not-found states.
5. **Duplicate fingerprint.** Run two concurrent upserts for the
   same service + fingerprint while unresolved and confirm only one
   unresolved incident exists afterwards, with occurrence count
   reflecting the later sighting.
6. **Resolved fingerprint reuse.** Resolve an incident, then upsert
   the same fingerprint again and confirm a new incident can be
   created (the unique index excludes resolved rows).
7. **Log ordering and cap.** Seed more than 500 logs for one
   incident, confirm the store returns 500 newest-first, and confirm
   the workspace still renders a correct, labelled timeline.
8. **Empty database.** With empty tables, confirm every page shows
   its existing empty state, not an error and not demo data.
9. **Backend unavailable.** With the database stopped, confirm
   actions fail honestly (error banner, no synthetic success) and
   the Integrations page still shows Disconnected, not Connected.
10. **Regression.** Re-run `pnpm typecheck`,
    `pnpm agent-native:doctor`, the contract tests in
    `shared/tracemind/contract.test.ts`, and the route smoke checks
    (all TraceMind routes return HTTP 200 with correct titles).

## Wiring checklist (for the backend developer to confirm)

- [ ] Migration runner agreed and `schema.sql` applied to the
      agreed environments only.
- [ ] Store wired into `list-incidents`, `get-incident`, and
      `list-logs` first; services, health, investigations,
      deployments, and integrations stay demo until their stores
      land.
- [ ] Filter ownership decided (action vs store) for
      `list-incidents`.
- [ ] Status-update method added before any status-update UI is
      built.
- [ ] `demo` flag handling agreed for real rows.
- [ ] No credential, token, or database URL in committed code,
      demo data, or documentation.
