-- CONTRACT. Only the owner edits this file. Run once against DATABASE_URL.
-- The whole request is stored as JSON to keep this fast to change; a few columns are pulled out for sorting.

create table if not exists requests (
  id text primary key,
  created_at timestamptz not null default now(),
  customer text not null,
  status text not null,
  ending text,            -- 'goes_live' | 'needs_person' once classified
  data jsonb not null     -- the full FactoryRequest
);
create index if not exists requests_status_idx on requests (status, created_at);

create table if not exists build_steps (
  id bigserial primary key,
  request_id text not null references requests(id),
  step text not null,
  status text not null,   -- 'running' | 'passed' | 'failed'
  at timestamptz not null default now(),
  log text
);
create index if not exists build_steps_request_idx on build_steps (request_id, at);
