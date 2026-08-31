-- Composio maps each Decision Arena user to their own GitHub connection.
-- Safe to re-run.

alter table public.users
  add column if not exists composio_user_id text;

create unique index if not exists users_composio_user_id_idx
  on public.users (composio_user_id)
  where composio_user_id is not null;
