import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { storeToken, validateToken as validateTokenUtil } from '@/lib/integration/token-store';

/**
 * POST /api/integration/auth
 * POST /api/integration/user/refresh
 * 
 * Username/password authentication endpoint (similar to BeatRoute)
 * Returns a token that can be used for subsequent API calls
 * 
 * Request Body:
 * {
 *   "username": "test_erp_user",
 *   "password": "test_password_123"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "data": {
 *     "token": "generated_token_here"
 *   },
 *   "status": 200
 * }
 * 
 * Response (Error):
 * {
 *   "success": false,
 *   "data": {
 *     "name": "Unauthorized",
 *     "message": "Invalid username or password",
 *     "code": 0,
 *     "status": 401
 *   },
 *   "status": 401
 * }
 */

interface AuthRequest {
  username: string;
  password: string;
}

// Generate a secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate username and password
function validateCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.INTEGRATION_USERNAME || process.env.INTEGRATION_TEST_USERNAME;
  const expectedPassword = process.env.INTEGRATION_PASSWORD || process.env.INTEGRATION_TEST_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.error('INTEGRATION_USERNAME and INTEGRATION_PASSWORD environment variables not set');
    return false;
  }

  return username === expectedUsername && password === expectedPassword;
}

// Token storage is handled by lib/integration/token-store.ts

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          data: {
            name: 'Bad Request',
            message: 'Request body must be valid JSON',
            code: 0,
            status: 400,
          },
          status: 400,
        },
        { status: 400 }
      );
    }

    const req = body as Record<string, unknown>;

    // Validate request body
    if (!req.username || typeof req.username !== 'string') {
      return NextResponse.json(
        {
          success: false,
          data: {
            name: 'Bad Request',
            message: 'username is required and must be a string',
            code: 0,
            status: 400,
          },
          status: 400,
        },
        { status: 400 }
      );
    }

    if (!req.password || typeof req.password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          data: {
            name: 'Bad Request',
            message: 'password is required and must be a string',
            code: 0,
            status: 400,
          },
          status: 400,
        },
        { status: 400 }
      );
    }

    // At this point, username and password are validated to be string
    const username = req.username as string;
    const password = req.password as string;

    // Validate credentials
    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        {
          success: false,
          data: {
            name: 'Unauthorized',
            message: 'Invalid username or password',
            code: 0,
            status: 401,
          },
          status: 401,
        },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken();
    const expiresIn = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Store token with expiration
    storeToken(token, expiresIn);

    // Return success response (matching BeatRoute format)
    return NextResponse.json(
      {
        success: true,
        data: {
          token: token,
        },
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in auth endpoint:', error);
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

// Export function to validate tokens (for use in other endpoints)
export { validateToken } from '@/lib/integration/token-store';

