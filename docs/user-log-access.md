# Log access without project IAM administration

Most users who can use an app cannot change its Google Cloud project
permissions, so a setup that requires a project IAM administrator
blocks most users. TraceMind therefore supports two log-access routes.
Only one is needed for a given run.

## Route 1: service account (deployed scheduler)

Create `tracemind-monitor` and bind `roles/logging.viewer` at the
project level, as described by the Google Cloud onboarding panel.
This requires a project IAM administrator, because granting a role at
project level is a `setIamPolicy` operation. Use this route for a
deployed scheduler with a runtime identity. The polling job uses it
when `TRACEMIND_AUTH_MODE` is unset or set to `runtime`, via the
metadata server. No JSON keys are created or used.

## Route 2: operator's own login (demo / self-hosted)

Run the watcher as the operator, using the operator's own Application
Default Credentials. No service account is created and no project IAM
policy is changed. It reads only what the operator can already read.
The token is short-lived, is obtained locally by `gcloud`, and is
never stored, never returned to the browser, and never sent to chat.
Use this route when the operator does not have IAM administration,
including for the hackathon live test.

### Prove access first (no database, no writes)

In Cloud Shell, or on the operator's machine after signing in with
`gcloud auth application-default login`:

```sh
export TRACEMIND_GCP_PROJECT_ID=elantra-gameolive
export TRACEMIND_GCP_SERVICE=dev-game-play-service
export TRACEMIND_GCP_REGION=asia-south2
npx -y tsx scripts/verify-user-log-access.ts
```

A successful run prints `authorized: true` and a timestamp. A
permission error here means the operator's own login cannot read the
service's logs, and no polling run will succeed either; the operator
then needs viewer access to the project, or the service-account route
with an administrator.

### Run one poll as the operator

Only after the probe succeeds, set the database connection in the
same shell session (from the operator's own database console, never
pasted to chat or to an assistant) and run one poll:

```sh
export DATABASE_URL='<from the operator’s own database console>'
export TRACEMIND_AUTH_MODE=user
npx -y tsx scripts/poll-cloud-run.ts
```

The poll verifies log access again, then runs one monitoring cycle
with the durable checkpoint and per-service lock. It writes incidents
and logs to the configured database only.

### Historical verification (errors older than the poll lookback)

The normal poll only looks back five minutes from its first run, plus
a one-minute checkpoint overlap. Genuine errors older than that are
not collected by a normal poll, and the checkpoint must not be moved
to force a pass. Instead, run the read-only historical check, which
runs the existing detector over a past window and writes nothing:

```sh
export TRACEMIND_GCP_PROJECT_ID=elantra-gameolive
export TRACEMIND_GCP_SERVICE=dev-game-play-service
export TRACEMIND_GCP_REGION=asia-south2
export TRACEMIND_AUTH_MODE=user
export TRACEMIND_LOOKBACK_HOURS=24
npx -y tsx scripts/verify-historical-incidents.ts
```

It prints events collected, error events, and any detected groups
with their counts and first/last seen times. No database rows, no
checkpoint, and no incident records are written. A detected group
here proves the detector groups the real errors; it does not by
itself prove the live poll chain, which still needs a fresh error
within the poll window or a deployed run.

## What this route does not do

It does not replace a proper product sign-in flow. A future
user-facing version should let each user sign in with Google and
grant log-read permission directly, so no operator shell is needed at
all. That flow is not built yet; this route is the honest
demo/self-hosted bridge that removes the IAM-administrator blocker
without faking an OAuth connection or accepting a credential from
browser input.
