import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/integration/health
 * 
 * Health check endpoint for external warehouse integration
 * Validates API key from Authorization: Bearer header
 * 
 * Response:
 * - 200: {"status": "operational", "authenticated": true}
 * - 401: {"status": "failed", "error": "Unauthorized", "authenticated": false}
 */
export async function GET(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Missing or invalid Authorization header',
          authenticated: false,
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
    const expectedApiKey = process.env.INTEGRATION_API_KEY;

    if (!expectedApiKey) {
      console.error('INTEGRATION_API_KEY environment variable not set');
      return NextResponse.json(
        {
          status: 'error',
          error: 'Server configuration error',
          authenticated: false,
        },
        { status: 500 }
      );
    }

    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Invalid API key',
          authenticated: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'operational',
      authenticated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        authenticated: false,
      },
      { status: 500 }
    );
  }
}
