-- Public share links for a decision brief. Read by token. Written only
-- through the Next.js API with the service role.

create table if not exists public.decision_shares (
  token text primary key,
  user_login text,
  project_id text,
  decision_id text,
  brief jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists decision_shares_created_at_idx
  on public.decision_shares (created_at desc);

alter table public.decision_shares enable row level security;

revoke all on public.decision_shares from anon, authenticated, public;

comment on table public.decision_shares is
  'Read-only decision briefs, addressed by a public token. Service role only.';
