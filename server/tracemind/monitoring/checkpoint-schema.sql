-- Monitoring cursor per project, region and service.
create table if not exists tracemind_poll_checkpoints (
  project_id text not null,
  service_name text not null,
  region text not null,
  last_successful_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (project_id, service_name, region)
);
