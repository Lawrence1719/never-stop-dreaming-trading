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
  const isCourierPage = url.pathname.startsWith('/courier') || url.pathname.startsWith('/api/courier')
  const isProfilePage = url.pathname.startsWith('/profile') || url.pathname.startsWith('/settings')

  // Debug logging to identify loop causes
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Proxy] ${request.method} ${url.pathname} | Auth: ${!!user} | Role: ${user?.user_metadata?.role || 'none'}`)
  }

  // 1. Redirect logged-in users away from auth pages (login/register)
  if (isAuthPage && user) {
    const role = user.user_metadata?.role || user.app_metadata?.role;
    if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    if (role === 'courier') return NextResponse.redirect(new URL('/courier/dashboard', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 1.5. Courier Global Lockdown: Couriers can ONLY access /courier/*
  if (user) {
    const role = user.user_metadata?.role || user.app_metadata?.role;
    // Allow static assets, Auth APIs (for logout), Public APIs, and Courier routes
    const isStaticAsset = url.pathname.match(/\.(.*)$/) || url.pathname.startsWith('/_next');
    const isAuthRoute = url.pathname.startsWith('/auth') || url.pathname.startsWith('/api/auth');
    // Whitelist public APIs AND courier API routes (they handle their own auth internally)
    const isPublicApi = url.pathname.startsWith('/api/settings') || url.pathname.startsWith('/api/courier');
    
    if (role === 'courier' && !isCourierPage && !isStaticAsset && !isAuthRoute && !isPublicApi) {
      console.warn(`[Proxy] Courier attempted to access restricted route: ${url.pathname} | Redirecting to dashboard`)
      return NextResponse.redirect(new URL('/courier/dashboard', request.url))
    }
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (!profile || profile.role !== 'admin') {
        console.warn(`[Proxy] Forbidden access to admin (Role: ${profile?.role || 'none'}): ${url.pathname}`)
        // Redirect couriers to their dashboard, others to home
        if (profile?.role === 'courier') {
          return NextResponse.redirect(new URL('/courier/dashboard', request.url))
        }
        return NextResponse.redirect(new URL('/', request.url))
      }

      // SELF-HEALING: Role mismatch detected
      console.info(`[Proxy] Self-Healing: Syncing Role for user ${user.id} to 'admin'`)
      await supabase.auth.updateUser({
        data: { role: 'admin' }
      })
    }
  }

  // 3. Courier Protection: Lock down /courier pages only (not /api/courier — those return JSON from handlers).
  // Including /api/courier in isCourierPage caused middleware to redirect API fetches to /login (HTML) when
  // cookie session was not visible here, breaking fetch().json() on the courier dashboard.
  if (url.pathname.startsWith('/courier')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', url.pathname)
      return NextResponse.redirect(loginUrl)
    }

    const role = user.user_metadata?.role || user.app_metadata?.role;

    if (role !== 'courier') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'courier') {
        console.warn(`[Proxy] Forbidden access to courier (Role: ${profile?.role || 'none'}): ${url.pathname}`)
        if (profile?.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
        return NextResponse.redirect(new URL('/', request.url))
      }

      // SELF-HEALING: Role mismatch detected
      console.info(`[Proxy] Self-Healing: Syncing Role for user ${user.id} to 'courier'`)
      await supabase.auth.updateUser({
        data: { role: 'courier' }
      })
    }
  }

  // 4. Profile Protection: Must be logged in
  if (isProfilePage && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', url.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
