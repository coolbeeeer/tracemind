-- TraceMind monitoring tables. Apply with your normal migration runner.
create table if not exists tracemind_incidents (
  id text primary key,
  service_id text not null,
  fingerprint text not null,
  status text not null check (status in ('open', 'investigating', 'resolved')),
  detected_at timestamptz not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  occurrence_count integer not null check (occurrence_count > 0),
  incident jsonb not null
);

-- Protect against two polling workers inserting the same unresolved error.
create unique index if not exists tracemind_incidents_active_fingerprint
  on tracemind_incidents(service_id, fingerprint)
  where status <> 'resolved';

create index if not exists tracemind_incidents_detected_at
  on tracemind_incidents(detected_at desc);

create table if not exists tracemind_logs (
  id text primary key,
  incident_id text not null references tracemind_incidents(id),
  service_id text not null,
  timestamp timestamptz not null,
  level text not null check (level in ('error', 'warn', 'info')),
  message text not null,
  trace_id text
);

create index if not exists tracemind_logs_incident_time
  on tracemind_logs(incident_id, timestamp desc);
