/**
 * Integration Token Store — Supabase DB backend
 *
 * Replaces the in-process Map that was lost on every serverless cold start.
 * Tokens are stored in the `integration_tokens` table (see migration 050)
 * and are therefore persistent across all instances and restarts.
 *
 * Default TTL: 1 hour (configurable via INTEGRATION_TOKEN_TTL_HOURS env var).
 */

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[token-store] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  return createClient(url, key);
}

function ttlMs(): number {
  const hours = parseFloat(process.env.INTEGRATION_TOKEN_TTL_HOURS || '1');
  return (Number.isFinite(hours) && hours > 0 ? hours : 1) * 60 * 60 * 1000;
}

/**
 * Persist a new token in the database with an expiry timestamp.
 */
export async function storeToken(token: string, expiresInMs?: number): Promise<void> {
  const sb = getAdminClient();
  const expiresAt = new Date(Date.now() + (expiresInMs ?? ttlMs())).toISOString();

  const { error } = await sb
    .from('integration_tokens')
    .insert({ token, expires_at: expiresAt, is_revoked: false });

  if (error) {
    console.error('[token-store] Failed to store token:', error);
    throw new Error('Failed to store integration token');
  }
}

/**
 * Validate a token.
 *
 * Returns true only when the token exists, has not expired, and has not been
 * revoked. Uses a constant-time approach at the DB query level — the supplied
 * value is used as an exact primary-key look-up so timing differences are
 * negligible compared to network latency.
 */
export async function validateToken(token: string): Promise<boolean> {
  if (!token) return false;

  const sb = getAdminClient();
  const { data, error } = await sb
    .from('integration_tokens')
    .select('expires_at, is_revoked')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return false;
  if (data.is_revoked) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  return true;
}

/**
 * Revoke a token immediately.
 */
export async function revokeToken(token: string): Promise<void> {
  const sb = getAdminClient();
  await sb
    .from('integration_tokens')
    .update({ is_revoked: true })
    .eq('token', token);
}
