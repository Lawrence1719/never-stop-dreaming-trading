-- Migration: 050_create_integration_tokens_table.sql
-- Replaces the in-process Map token store with a persistent DB table so tokens
-- survive serverless cold starts and are shared across all instances.

create table if not exists public.integration_tokens (
  token        text        not null primary key,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  is_revoked   boolean     not null default false
);

-- Only the service role (server-side) may read/write this table.
-- No public or anon access is permitted.
alter table public.integration_tokens enable row level security;

-- Deny all access to anonymous and authenticated roles.
-- The application uses the service-role client which bypasses RLS.
create policy "No public access to integration_tokens"
  on public.integration_tokens
  for all
  to anon, authenticated
  using (false);

-- Index for fast token lookups by expiry (used in cleanup).
create index if not exists integration_tokens_expires_at_idx
  on public.integration_tokens (expires_at);

-- Scheduled cleanup function: call this from a cron job or pg_cron.
-- Removes all expired or revoked tokens to keep the table small.
create or replace function public.cleanup_expired_integration_tokens()
returns void
language sql
security definer
as $$
  delete from public.integration_tokens
  where expires_at < now() or is_revoked = true;
$$;
