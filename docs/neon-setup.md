# Neon PostgreSQL setup for TraceMind

TraceMind uses a Neon **development database** for incident persistence. The UI
still has demo data when DATABASE_URL is unset; setting DATABASE_URL switches
the `list-incidents` Agent-Native action to real stored incidents.

## 1. Create a development database

1. In the [Neon console](https://console.neon.tech/), create a project or a
   dedicated development branch for TraceMind.
2. Open **Connect** and copy the PostgreSQL connection string for that branch.
3. Keep the connection string in a server-side secret/environment variable
   named `DATABASE_URL`. Never put it in a `VITE_*` variable, commit it to
   GitHub, or send it to the frontend. Neon connection strings contain a
   database password. Use SSL.
4. For migration/setup prefer the **direct** connection string; application
   traffic can use Neon's pooled connection string.

## 2. Apply the schema (development only)

From the repository root:

```bash
pnpm install
DATABASE_URL='<NEON_DEVELOPMENT_CONNECTION_STRING>' pnpm exec tsx scripts/setup-tracemind-db.ts
pnpm typecheck
pnpm test
```

Use your operating system's secure environment-variable mechanism instead of
pasting real credentials into shell history. The placeholder above is not a
credential. The setup script prints only a success/failure message.

## 3. Validate action integration

Start the Agent-Native app with the same server-side DATABASE_URL. The
`list-incidents` action should return `{ incidents: [], demo: false }`
before any real incidents are ingested. An empty live database is **not** a
reason to fall back to demo rows.

Without DATABASE_URL, `list-incidents` deliberately returns labelled demo
data. If a configured database is unreachable, the action must fail rather
than silently return demo records.

## 4. Remaining work before live monitoring

- Configure a Google Cloud service identity with the minimal Cloud Logging
  read permission and a secure, server-side short-lived token provider.
- Build a polling job that fetches logs, detects incidents, persists incident
  and log records, and checkpoints its last successful read.
- Add concurrency-safe conflict handling for simultaneous pollers. The
  partial unique index protects open incident identity, but a concurrent
  insert currently can still fail; that needs retry/merge behavior.
- Wire `get-incident` and `list-logs` actions to the store and test the
  frontend against a development database.
- Ensure tenant/project authorization before any service log query or
  incident read. The current store is not tenant-scoped and is **not ready**
  for a multi-tenant production deployment.
- Review sensitive log redaction, retention, rate limits, and access controls.

Do not use a production Neon database until migrations, authorization,
idempotency, and recovery paths are tested.
