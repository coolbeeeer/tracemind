-- Google Cloud OAuth connection state. No Google access or refresh
-- tokens are stored in either table; tokens live only in the
-- framework credential vault. The transaction table is short-lived
-- and single-use: state is stored only as a SHA-256 hash, the PKCE
-- verifier is stored encrypted, and claiming is an atomic UPDATE
-- that succeeds for at most one callback.
create table if not exists tracemind_oauth_transactions (
  state_hash text primary key,
  user_email text not null,
  code_verifier_encrypted text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tracemind_oauth_transactions_expires_idx
  on tracemind_oauth_transactions (expires_at);

-- Non-secret connection metadata, one row per TraceMind user.
create table if not exists tracemind_google_connections (
  user_email text primary key,
  status text not null,
  google_account_email text,
  scopes text not null,
  project_id text,
  service_name text,
  region text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
