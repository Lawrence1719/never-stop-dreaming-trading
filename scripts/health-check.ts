/**
 * Health Check Script
 * 
 * Usage: npx tsx scripts/health-check.ts --url https://your-deployment.vercel.app
 */

import { parseArgs } from 'util';

const endpoints = [
  '/api/health',
  '/api/public/products',
  '/api/cms/pages',
  '/api/cms/faqs',
  '/api/cms/testimonials',
  '/api/settings/public',
  '/api/orders', // Should return 401
  '/api/admin/dashboard', // Should return 401
  '/api/admin/settings', // Should return 401
];

async function runHealthCheck() {
  const { values } = parseArgs({
    options: {
      url: {
        type: 'string',
        short: 'u',
        default: 'http://localhost:3000',
      },
    },
  });

  const baseUrl = values.url?.replace(/\/$/, '') || 'http://localhost:3000';
  console.log(`\n🚀 Starting health check for: ${baseUrl}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const startTime = Date.now();
      const response = await fetch(url);
      const endTime = Date.now();
      const duration = endTime - startTime;

      let status = '';
      let errorInfo = '';

      if (response.ok) {
        status = '✅ OK';
        successCount++;
      } else if (response.status === 401 || response.status === 403) {
        status = '🔒 Protected (Expected)';
        successCount++;
      } else {
        status = `❌ Error (${response.status})`;
        failCount++;
        try {
          const errorData = await response.json();
          errorInfo = ` | Error: ${errorData.error || errorData.message || JSON.stringify(errorData)}`;
        } catch {
          errorInfo = ` | Unexpected response format`;
        }
      }

      console.log(`${status.padEnd(25)} | ${endpoint.padEnd(30)} | ${duration}ms${errorInfo}`);
      
      if (endpoint === '/api/health' && response.ok) {
        const data = await response.json();
        console.log(`   └─ DB: ${data.database === 'connected' ? '✅' : '❌'} | Status: ${data.status}`);
      }

    } catch (error) {
      console.log(`❌ Failed to reach       | ${endpoint.padEnd(30)} | Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total: ${endpoints.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`---------------\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runHealthCheck().catch((err) => {
  console.error('Fatal error during health check:', err);
  process.exit(1);
});
