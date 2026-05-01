import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Different limiters for different risk levels
export const rateLimiters = {
  // Auth endpoints - strictest
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:auth',
  }),

  // High risk unauthenticated endpoints
  high: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:high',
  }),

  // Expensive server operations
  expensive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:expensive',
  }),

  // Authenticated user actions
  user: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:user',
  }),

  // Admin operations
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:admin',
  }),

  // Standard reads
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:standard',
  }),
}

export function getIdentifier(req: Request, userId?: string): string {
  // Prefer user ID for authenticated requests, fall back to IP
  if (userId) return `user:${userId}`
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous'
  return `ip:${ip}`
}

export function rateLimitResponse(reset: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Reset': String(reset),
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      },
    }
  )
}
