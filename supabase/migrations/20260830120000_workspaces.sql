-- One workspace row per GitHub login. device_id stores the GitHub username
-- from the signed-in session. The service role (not the anon key) reads and writes.

create table if not exists public.workspaces (
  device_id text primary key,
  website text not null default '',
  github text not null default '',
  docs_url text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

revoke all on public.workspaces from anon, authenticated, public;

comment on table public.workspaces is
  'Decision Arena workspace. Reached only through the Next.js API with the service role.';
