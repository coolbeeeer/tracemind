-- Durable investigation results. Apply after monitoring schema.
create table if not exists tracemind_investigations (
  id text primary key,
  incident_id text not null references tracemind_incidents(id),
  status text not null check (status in ('not-started', 'running', 'completed', 'failed')),
  started_at timestamptz not null,
  investigation jsonb not null
);
create index if not exists tracemind_investigations_incident_started
  on tracemind_investigations(incident_id, started_at desc);
