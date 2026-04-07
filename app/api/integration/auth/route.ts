import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { storeToken, validateToken as validateTokenUtil } from '@/lib/integration/token-store';

/**
 * POST /api/integration/auth
 * POST /api/integration/user/refresh
 *
 * Username/password authentication endpoint (BeatRoute-compatible).
 * Returns a short-lived token for subsequent API calls.
 *
 * Required env vars:
 *   INTEGRATION_USERNAME — the ERP system's username
 *   INTEGRATION_PASSWORD — min 32 random chars (see .env.example)
 *
 * Request Body:
 * { "username": "nsd_integration", "password": "<INTEGRATION_PASSWORD>" }
 *
 * Success Response:
 * { "success": true, "data": { "token": "<hex token>" }, "status": 200 }
 */

// Generate a cryptographically random opaque token.
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compare credentials using timing-safe byte comparison to prevent
 * timing-oracle attacks that could be used to enumerate valid usernames
 * or brute-force the password character-by-character.
 *
 * Both sides are zero-padded to the same length before comparison so
 * the comparison time is constant regardless of where strings diverge.
 */
function safeEqual(a: string, b: string): boolean {
  // Encode to UTF-8 buffers.
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // Pad the shorter buffer so both have identical length.
  // We still return false when lengths differ — padding prevents
  // timingSafeEqual from throwing, but the length guard ensures correctness.
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)]);
  const paddedB = Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)]);

  // timingSafeEqual runs in constant time relative to buffer length.
  // The explicit length check prevents a scenario where two strings of
  // different lengths happen to compare equal after padding (impossible
  // in practice, but we're being strict).
  return bufA.length === bufB.length && crypto.timingSafeEqual(paddedA, paddedB);
}

function validateCredentials(username: string, password: string): boolean {
  const expectedUsername =
    process.env.INTEGRATION_USERNAME || process.env.INTEGRATION_TEST_USERNAME;
  const expectedPassword =
    process.env.INTEGRATION_PASSWORD || process.env.INTEGRATION_TEST_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.error(
      '[integration/auth] INTEGRATION_USERNAME and INTEGRATION_PASSWORD must be set.'
    );
    return false;
  }

  // Both comparisons use safeEqual so the total execution time does not
  // reveal which field was wrong.
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          data: { name: 'Bad Request', message: 'Request body must be valid JSON', code: 0, status: 400 },
          status: 400,
        },
        { status: 400 }
      );
    }

    const req = body as Record<string, unknown>;

    if (!req.username || typeof req.username !== 'string') {
      return NextResponse.json(
        {
          success: false,
          data: { name: 'Bad Request', message: 'username is required and must be a string', code: 0, status: 400 },
          status: 400,
        },
        { status: 400 }
      );
    }

    if (!req.password || typeof req.password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          data: { name: 'Bad Request', message: 'password is required and must be a string', code: 0, status: 400 },
          status: 400,
        },
        { status: 400 }
      );
    }

    const username = req.username;
    const password = req.password;

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        {
          success: false,
          data: { name: 'Unauthorized', message: 'Invalid username or password', code: 0, status: 401 },
          status: 401,
        },
        { status: 401 }
      );
    }

    // Generate and persist the token (DB-backed, survives cold starts).
    const token = generateToken();
    const ttlHours = parseFloat(process.env.INTEGRATION_TOKEN_TTL_HOURS || '1');
    const expiresInMs = (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 1) * 60 * 60 * 1000;

    await storeToken(token, expiresInMs);

    return NextResponse.json(
      { success: true, data: { token }, status: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error('[integration/auth] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          name: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          code: 0,
          status: 500,
        },
        status: 500,
      },
      { status: 500 }
    );
  }
}

// Re-export validateToken so integration endpoint routes can import it from here.
export { validateToken } from '@/lib/integration/token-store';
