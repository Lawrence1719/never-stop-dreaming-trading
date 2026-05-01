import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const pathname = url.pathname

  // Rate Limiting Layer (Runs before Auth)
  let limiter;
  
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/reset-password') ||
    pathname.startsWith('/api/register')
  ) {
    limiter = rateLimiters.auth;
  } else if (
    pathname === '/api/coupons/validate' ||
    pathname === '/api/contact' ||
    pathname === '/api/newsletter/subscribe' ||
    pathname === '/api/validate/address'
  ) {
    limiter = rateLimiters.high;
  } else if (
    pathname.startsWith('/api/public/') ||
    pathname === '/api/settings/public' ||
    pathname.startsWith('/api/cms/')
  ) {
    limiter = rateLimiters.standard;
  }

  if (limiter) {
    const identifier = getIdentifier(request);
    try {
      const { success, reset } = await limiter.limit(identifier);
      if (!success) return rateLimitResponse(reset);
    } catch (err) {
      console.error('[RateLimit] Redis unavailable, failing open:', err);
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public directory)
     * - api/integration (internal API key integration)
     * - api/health (public health check)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/integration|api/health|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|json)$).*)',
    '/api/auth/:path*',
  ],
}
