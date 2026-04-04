/**
 * Reads GoTrue `session_id` from a Supabase access token JWT payload.
 * Used server-side so "current session" matches across devices and matches auth.sessions.id.
 */
export function getSessionIdFromAccessToken(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      session_id?: string
    }
    return json.session_id ?? null
  } catch {
    return null
  }
}
