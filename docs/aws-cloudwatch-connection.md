# AWS CloudWatch + database log reading

## What exists now (server-side engine, tested)

- `server/tracemind/monitoring/cloudwatch-client.ts` — read-only
  CloudWatch Logs reader (FilterLogEvents) with AWS SigV4 signing, no
  AWS SDK dependency, mirroring the Cloud Logging client. Pagination
  follows the same rule as GCP: if entries remain after the page
  limit, it throws instead of returning a partial set, so a polling
  checkpoint never advances past unread logs.
- `server/tracemind/monitoring/cloudwatch-normalizer.ts` and
  `error-severity.ts` — CloudWatch events become the shared monitoring
  event. An "error" is a message carrying an unambiguous failure
  marker (error, fatal, critical, exception, traceback, unhandled,
  timed out, out of memory). A bare "failed" is deliberately NOT
  counted: business outcomes ("payment failed") are not incidents.
- `server/tracemind/monitoring/run-aws-monitoring-cycle.ts` — the AWS
  mirror of the Cloud Run cycle: same redaction, same incident
  detection (3 matching errors in 5 minutes), same reconciliation and
  storage. CloudWatch carries no HTTP status, so an AWS error burst
  classifies as warning, not critical; the incident is still created.
- `server/tracemind/integrations/verify-aws-access.ts` — permission
  probe: one tiny read proves the credentials can read a log group.
  A successful empty result still counts as authorized.
- `server/tracemind/monitoring/db-table-log-reader.ts` — reads error
  logs out of a database table the caller names (table, timestamp
  column, message column, optional level column). Table and column
  names are validated as identifiers, never interpolated raw, and the
  read fetches one row past the limit so truncation fails loudly
  instead of silently skipping rows. This is for applications that
  write their own logs to a table; SQL cannot read a database
  server's own log files.

## What is NOT built yet

- No AWS Connect button in the app UI. The backend contract still
  forbids pretending a provider is connected, so the UI keeps AWS as
  coming-soon until the connection step lands.
- No AWS connection records store and no scheduled polling wired to
  AWS credentials. The engine above takes credentials as parameters
  from the caller (resolved from the server-side vault), exactly like
  the GCP token path; the step that stores a user's AWS credentials
  and runs the cycle on a schedule is still to build, after the user
  provides the items below.

## What the user must provide (to switch it on for their account)

- AWS region (for example ap-south-1) and the exact log group names
  (for example /aws/lambda/my-api, /aws/rds/instance/mydb/postgresql).
- An IAM identity with ONLY these permissions, scoped to those log
  groups: logs:DescribeLogGroups, logs:DescribeLogStreams,
  logs:FilterLogEvents, logs:GetLogEvents. No admin rights, no write
  access, no root keys.
- The access key and secret for that identity, entered through the
  app's secure credential flow when the Connect step lands — never
  pasted in chat.
- For database logs: the database, the table name, and which columns
  hold the timestamp, the message, and the level (if any), plus a
  read-only database user that can SELECT only that table.
