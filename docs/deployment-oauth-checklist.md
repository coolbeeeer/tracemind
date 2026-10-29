# Live OAuth test: deployment and configuration checklist

Status: Connect, callback, and Disconnect are implementation-complete
and approved for live testing. The live round trip is NOT yet
tested. Nothing here asks any end user for a secret; every
credential below is deployment configuration, provisioned through
the framework vault or the deployment's approved secret
mechanism. Never paste a client secret, encryption key, database
URL, or token into chat.

## 1. Deploy TraceMind

- Deploy the `feature/tracemind-integration` branch to a public
  HTTPS host. Record the hostname as `<deployment-host>`.
- The exact Google callback URI is then:

  `https://<deployment-host>/auth/google/callback`

  This exact URI must match the OAuth client registration
  character for character. A different host, path, or scheme
  will fail with a redirect URI mismatch at Google's consent
  screen.

## 2. Apply database migrations

- Run the setup script against the deployment database so all
  tables exist, including the OAuth tables:
  `tracemind_oauth_transactions` and
  `tracemind_google_connections`, alongside the existing
  incident, log, checkpoint, and investigation tables.
- Confirm the two OAuth tables exist before testing; a missing
  table fails the connection, it does not fall back to demo.

## 3. Provision deployment configuration in the vault

These four values are resolved server-side for the
authenticated user and are never accepted from the browser:

- `GOOGLE_CLIENT_ID` — the developer OAuth client's ID.
- `GOOGLE_CLIENT_SECRET` — the developer OAuth client's secret.
- `GOOGLE_REDIRECT_URI` — exactly the callback URI from step 1.
- `GOOGLE_OAUTH_ENCRYPTION_KEY` — base64 of 32 random bytes,
  generated server-side, used only to encrypt PKCE verifiers at
  rest. It is separate from the database and is not a Google
  credential.

Developer configuration and user-granted Google tokens must
stay logically separate, even though both use the vault: the
four values above are deployment configuration, while the
refresh and access tokens saved during consent belong to the
individual user who consented.

## 4. Configure the Google OAuth client (developer setup)

- In the TraceMind developer's Google Cloud project, create a
  Web application OAuth client.
- Set its authorized redirect URI to exactly the callback URI
  from step 1.
- Configure the consent screen and request only the scope
  `https://www.googleapis.com/auth/logging.read`.
- Confirm the consent configuration supports durable refresh
  tokens for the intended test user, so a test does not expire
  mid-flow.

## 5. First live test, in order

1. Sign in to the deployed TraceMind as the test user.
2. On Integrations, click Connect Google Cloud and complete
   Google consent.
3. Confirm the callback lands on Integrations with the
   connected banner, and that the code and state are gone from
   the address bar.
4. Confirm the session survived the redirect: the same
   authenticated account completed the flow. If the session is
   unavailable after returning from Google, the completion must
   fail safely and offer a reconnect, never a silent success.
5. Confirm the vault saved credentials and the connection
   record shows connected, then run a server-side Cloud Logging
   read using the user's authorized account and confirm real
   entries are returned.
6. Disconnect, and confirm the tokens and connection record are
   gone and a retry of the read no longer uses that account.
   If Disconnect reports an error after vault deletion but
   before metadata deletion, retry it: token deletion is
   idempotent, and the second attempt clears the metadata row.

## 6. What is still not live-verified

- Real Google consent and log access.
- Disconnect against a real Google token.
- Background monitoring with refreshed credentials (the poll
  worker that uses OAuth tokens does not exist yet; the
  operator poll script is a developer diagnostic only).

Do not merge to `main` until the live connection and
investigation workflow pass.
