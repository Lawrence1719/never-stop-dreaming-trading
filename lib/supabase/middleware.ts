import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Modern Next.js 16 Proxy/Middleware session updater.
 * Optimized for performance by avoiding redundant database hits where possible.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Standard Next.js cookie mutation pattern
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // This will refresh the session if it's expired
  // IMPORTANT: getUser() is the only secure way to verify the session in middleware
  const { data: { user } } = await supabase.auth.getUser()

  const url = new URL(request.url)
  const isAuthPage = url.pathname === '/login' || url.pathname === '/register'
  const isAdminPage = url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')
  const isProfilePage = url.pathname.startsWith('/profile') || url.pathname.startsWith('/settings')

  // Debug logging to identify loop causes
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Proxy] ${request.method} ${url.pathname} | Auth: ${!!user} | Role: ${user?.user_metadata?.role || 'none'}`)
  }

  // 1. Redirect logged-in users away from auth pages (login/register)
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. Admin Protection: Lock down /admin
  if (isAdminPage) {
    if (!user) {
      console.warn(`[Proxy] Unauthorized access to admin: ${url.pathname} | Redirecting to login`)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', url.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Fast check: Role from JWT metadata (avoiding DB hit on every request)
    const role = user.user_metadata?.role || user.app_metadata?.role;
    
    if (role !== 'admin') {
      // Deep check: If metadata is missing or incorrect, check the roles table
      // We only do this if metadata doesn't already confirm admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (!profile || profile.role !== 'admin') {
        console.warn(`[Proxy] Forbidden access to admin (Role: ${profile?.role || 'none'}): ${url.pathname}`)
        return NextResponse.redirect(new URL('/', request.url))
      }

      // SELF-HEALING: Role mismatch detected (Passport says customer, DB says admin)
      // Update metadata so the next request is lightning-fast (<10ms)
      console.info(`[Proxy] Self-Healing: Syncing Role for user ${user.id} to 'admin'`)
      await supabase.auth.updateUser({
        data: { role: 'admin' }
      })
    }
  }

  // 3. Profile Protection: Must be logged in
  if (isProfilePage && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', url.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
