import { createBrowserClient } from '@supabase/ssr'

/**
 * Modern Supabase Browser Client for Next.js 16.
 * Automatically synchronizes auth session with Cookies.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
