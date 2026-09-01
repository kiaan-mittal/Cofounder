-- Live spectator snapshots. Read by token. Written only through the
-- Next.js API with the service role and a write key the publisher holds.

create table if not exists public.decision_watches (
  token text primary key,
  write_key text not null,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists decision_watches_updated_at_idx
  on public.decision_watches (updated_at desc);

alter table public.decision_watches enable row level security;

revoke all on public.decision_watches from anon, authenticated, public;

comment on table public.decision_watches is
  'Live arena snapshots for /arena?watch= tokens. Service role only.';
