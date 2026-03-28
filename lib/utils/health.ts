import { getClient } from '@/lib/supabase/admin';

export interface HealthStatus {
  status: 'operational' | 'degraded' | 'error';
  database: 'connected' | 'disconnected' | 'error';
  timestamp: string;
  version?: string;
  uptime?: number;
}

/**
 * Checks the database connectivity by performing a simple query.
 */
export async function checkDatabase(): Promise<'connected' | 'disconnected' | 'error'> {
  try {
    const supabase = getClient();
    // Use a lightweight health check query
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('Database health check failed:', error);
      return 'disconnected';
    }
    
    return 'connected';
  } catch (error) {
    console.error('Database connection error:', error);
    return 'error';
  }
}

/**
 * Aggregates health status from all monitored components.
 */
export async function getOverallHealth(): Promise<HealthStatus> {
  const dbStatus = await checkDatabase();
  
  const status: HealthStatus['status'] = dbStatus === 'connected' ? 'operational' : 'error';
  
  return {
    status,
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    // In a serverless environment like Vercel, uptime isn't as meaningful,
    // but we can include process uptime for reference in local/long-running environments.
    uptime: process.uptime(),
  };
}
