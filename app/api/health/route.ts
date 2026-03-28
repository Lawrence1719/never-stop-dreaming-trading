import { NextResponse } from 'next/server';
import { getOverallHealth } from '@/lib/utils/health';

/**
 * GET /api/health
 * 
 * Public health check endpoint for monitoring systems.
 * Returns 200 OK if the system is operational (e.g. database connected).
 * Returns 503 Service Unavailable if critical components are failing.
 */
export async function GET() {
  try {
    const health = await getOverallHealth();
    
    // Determine status code based on health
    const statusCode = health.status === 'operational' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Public health check route error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error during health check',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
