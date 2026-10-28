# Google Cloud connection flow — implementation contract

## Current status

The `prepare-gcp-connection` Agent-Native action returns a validated,
administrator-reviewed setup plan and `connected: false`. It never accepts
secrets, starts OAuth, grants IAM, or pretends a project is connected.

## Intended user experience

1. User clicks **Connect Google Cloud** in Integrations.
2. UI asks for project ID and calls `prepare-gcp-connection`.
3. UI displays the returned setup commands and clearly labels the connection
   **Not connected**. A project administrator reviews and runs them.
4. After TraceMind is deployed with a trusted runtime identity, the backend
   performs a server-side authorization and Cloud Logging read probe.
5. Only a successful, tenant-scoped probe with durable authorized connection
   state can switch the UI to **Connected** and enable monitoring.

Do not add a simulated Connect success state or client-side token storage.

## Future OAuth option

A true "Connect with Google" button requires a configured Google OAuth
consent screen and client ID, a secure server-side callback, state/PKCE and
CSRF defenses, encrypted refresh-token storage if offline access is needed,
verified project access, revocation/disconnect handling, and per-tenant
authorization. OAuth sign-in alone does not grant a TraceMind service
identity access to customer project logs. Some organizations will require
administrator-approved IAM configuration.

## Frontend handoff

Muse can add a **Set up Google Cloud** panel to Integrations that calls
`prepare-gcp-connection`, displays `commands` with copy affordances, and
explains `nextSteps`. Keep status `not-connected` until the actual
connection verification action exists.

## Security and operational blockers

- Authorize every action for the authenticated TraceMind tenant.
- Store connection metadata and project ownership/approval durably.
- Bind a workload identity to the backend; avoid service account key files.
- Add a server-side Cloud Logging access probe with permission failures.
- Ensure poller locks/checkpoints, pagination completeness and retries.
- Redact logs before both fingerprinting and storage; add secret scanning.
- Run typecheck, tests, and a real least-privilege integration test.
