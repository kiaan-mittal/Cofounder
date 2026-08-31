-- Sealed GitHub OAuth token so the three-day brain refresh can re-read
-- private repositories without a browser session. Never selected by the
-- client-facing workspace GET.

alter table public.workspaces
  add column if not exists github_token_sealed text;

comment on column public.workspaces.github_token_sealed is
  'AES-GCM sealed GitHub access token. Server-only. Used by /api/cron/brain.';
