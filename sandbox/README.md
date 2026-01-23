# Sandbox Environment

This is the sandbox/test environment for ERP integration testing.

## Setup

1. **Install dependencies:**
   ```bash
   cd sandbox
   npm install
   ```

2. **Create `.env.local` file:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-sandbox-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-sandbox-service-role-key
   INTEGRATION_USERNAME=test_erp_user
   INTEGRATION_PASSWORD=test_password_123
   INTEGRATION_API_KEY=your-sandbox-api-key
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   - Runs on port 3001 (production runs on 3000)

## Deployment

- Deploy to Vercel with **Root Directory** set to `sandbox/`
- Use sandbox environment variables
- Separate from production deployment
