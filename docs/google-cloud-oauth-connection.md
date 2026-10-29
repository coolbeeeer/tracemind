# Google Cloud OAuth connection (in progress, not yet live)

The intended user experience is: open TraceMind, click Connect
Google Cloud, authorize log-read access in Google, and see real
logs, with no Cloud Shell, no clone, and no commands. This document
records what is built, what is not, and what still blocks a live
test, so no part is claimed before it is verified.

## Built

`server/tracemind/integrations/google-oauth-connection.ts` (server
only, tested) implements the flow primitives:

- Authorization URL with only `https://www.googleapis.com/auth/logging.read`,
  `access_type=offline`, `prompt=consent`, and PKCE S256.
- Authorization-code exchange that refuses to proceed unless Google
  granted logging.read and returned a refresh token. An access-only
  result is an error, not a connection, because background
  monitoring needs refresh.
- Access-token refresh, including keeping the old refresh token
  when Google does not rotate it.
- Valid-token resolution with a 60-second expiry skew: return the
  current access token when it is still valid, otherwise refresh
  and return the tokens the caller must persist.
- Token storage is through the framework credential vault (user
  scope for the refresh token), never in the database, browser,
  logs, or action outputs. The vault stores strings only; expiry
  and refresh live in this module, not in the vault.

The existing log reader (`fetchCloudRunLogs`) and the existing
log-access verification (`verifyGcpLoggingAccess`, one entry) are
reused unchanged for the post-connection check: a connection is
only shown as Connected after a verified log read.

## Route registration, verified 2026-10-29

Two probes were run against the dev server and then deleted, with
the repo left clean:

- A Nitro-style file at `server/routes/api/tracemind-probe.get.ts`
  returned 401, exactly like a definitely non-existent
  `/api/no-such-route-xyz123`. That 401 is global `/api/*` auth
  handling, not proof of a handler, so it proves nothing about
  Nitro route registration and must not be cited as proof.
- A React Router page route at `app/routes/tracemind-probe.tsx`
  with a server loader returned 200, and the SSR payload contained
  loader data for `routes/tracemind-probe` with the probe value.
  Page routes are auto-discovered by this scaffold, and their
  loaders run server-side.

Conclusion: the OAuth callback should be a React Router route
with a server loader that validates state, exchanges the code,
persists through the vault, and redirects to a fixed internal
page, not a Nitro file route under `server/routes/api/`. The
backend-contracts note about that directory describes a future
backend route, not the scaffold's verified route mechanism.

## Vault lifecycle, partially verified

The framework credential vault API surface is verified from its
type definitions: `saveCredential`, `resolveCredential`,
`hasCredential`, and `deleteCredential` / `deleteResolvedCredential`,
with user and org scopes, over an encrypted store. A live
write → read → update-after-refresh → delete cycle inside the
app context is not proven by unit tests, which mock the vault;
it will be proven during the local OAuth round trip, not before.

## Not built yet

- **HTTP callback route.** See the route-registration section
  above: it will be a React Router route with a server loader,
  not a Nitro file route. It is not built yet, and the Connect
  button stays backend-gated until it is.
- **Connection metadata store.** See below.
- **Connection metadata store.** Which user, which project,
  service, and region, and the connection status (not connected,
  connecting, connected, permission denied, reconnect required)
  must live in structured SQL state, with tokens only in the vault.
  That table and store are not built yet.
- **Connect button and Disconnect.** The Integrations page still
  shows the backend-gated, non-functional Connect state on purpose.
  No button has been added that pretends to connect.
- **Scheduled polling through a user connection.** The polling
  worker must resolve a specific user's connection and refresh its
  token. That worker change is after the Connect flow is verified,
  not before.

## What blocks a live test

1. A public deployed address for TraceMind. Google requires an
   exact registered HTTPS callback URI; localhost is not a public
   callback, and the framework's redirect validation rejects
   loopback URIs by design.
2. A Google OAuth client for TraceMind itself, created in Google
   Cloud Console by the TraceMind developer (not by each end user):
   a web-application client, a consent configuration, the
   logging.read scope, and the redirect URI from item 1. Its
   client secret must be stored through the secure vault flow,
   never pasted to chat, and never in an environment variable that
   the doctor guard would flag.
3. Consent-mode care: in testing mode, refresh tokens can expire
   after a short period, which interrupts unattended monitoring.
   The consent configuration must support durable refresh tokens
   for the intended users before scheduled monitoring is claimed.

Until items 1 and 2 exist, the flow can be unit-tested with mocked
token endpoints, which is what the current tests do, but the live
Connect → consent → callback → verified log read flow cannot be
claimed as verified.
