-- Multi-tenant: a GitHub account is a user. A repository + website is a project.
-- Workspaces remain as a read-only archive after this copy; the app reads
-- users and projects going forward.

create table if not exists public.users (
  id text primary key,
  github_id bigint unique,
  github_login text not null unique,
  github_name text,
  avatar_url text,
  github_token_sealed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  name text not null,
  github_repo_id bigint,
  github_owner text not null default '',
  github_repo_name text not null default '',
  website_url text not null default '',
  docs_url text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_updated_at_idx on public.projects (updated_at desc);

create unique index if not exists projects_user_repo_idx
  on public.projects (user_id, github_repo_id)
  where github_repo_id is not null;

alter table public.users enable row level security;
alter table public.projects enable row level security;

revoke all on public.users from anon, authenticated, public;
revoke all on public.projects from anon, authenticated, public;

comment on table public.users is
  'GitHub-authenticated founders. Reached only through the Next.js API with the service role.';
comment on table public.projects is
  'One repository + website per row, owned by a user. Reached only through the Next.js API.';

insert into public.users (id, github_login, github_token_sealed, created_at, updated_at)
select
  'usr_' || device_id,
  device_id,
  github_token_sealed,
  created_at,
  updated_at
from public.workspaces
on conflict (github_login) do nothing;

insert into public.projects (
  id,
  user_id,
  name,
  github_owner,
  github_repo_name,
  website_url,
  docs_url,
  snapshot,
  created_at,
  updated_at
)
select
  coalesce(nullif(snapshot -> 'company' ->> 'id', ''), 'prj_' || device_id),
  'usr_' || device_id,
  coalesce(
    nullif(snapshot -> 'company' ->> 'name', ''),
    nullif(split_part(github, '/', 2), ''),
    device_id
  ),
  split_part(github, '/', 1),
  split_part(github, '/', 2),
  website,
  docs_url,
  snapshot,
  created_at,
  updated_at
from public.workspaces
on conflict (id) do nothing;
