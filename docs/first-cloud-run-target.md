# First Google Cloud Run monitoring target

TraceMind development target (non-secret configuration):

- GCP project ID: `elantra-gameolive`
- Cloud Run service: `dev-game-play-service`
- Region: `asia-south2`
- Data store: Neon PostgreSQL via server-only `DATABASE_URL`

## Grant read-only access

1. In Google Cloud Console select project `elantra-gameolive`.
2. Enable **Cloud Logging API** (`logging.googleapis.com`) if disabled.
3. Create a dedicated service account, e.g. `tracemind-monitor`.
4. Grant that identity **Logs Viewer** (`roles/logging.viewer`) on the project.
5. Run TraceMind on Google Cloud with that service account attached, using
   Application Default Credentials / workload identity. Avoid exporting or
   committing a long-lived service-account JSON key.
6. Grant the runtime access to the Neon `DATABASE_URL` via server-side secret
   management. Do not put credentials in frontend variables.

## Polling configuration

- Project: `elantra-gameolive`
- Service: `dev-game-play-service`
- Region: `asia-south2`
- Initial lookback: five minutes, with an overlap on subsequent polls.
- Start with one serialized worker. Do not schedule concurrent workers until
  the incident store supports conflict-safe upserts and checkpoints.
- Inspect only authorized log entries; redact sensitive messages before storage.

## Not yet deployed

The repository has a Cloud Logging client and monitoring cycle, but **does not
yet have** a deployed scheduler, workload identity token provider, persistent
cursor/checkpoint, or verified production-safe deduplication. This document is
configuration guidance, not a claim that logs are currently being ingested.
