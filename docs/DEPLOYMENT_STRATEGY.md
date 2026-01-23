# Deployment Strategy: Sandbox vs Production

**Date:** 2025-01-27  
**Purpose:** Guide for deploying sandbox and production from same codebase

---

## Recommended Approach: Separate Vercel Projects

**Same codebase, different deployments, different environment variables**

---

## Step-by-Step Setup

### Step 1: Create Sandbox Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Name: "E-commerce Sandbox" (or similar)
4. Region: Same as production (for consistency)
5. Database Password: Generate secure password
6. Wait for project to be created

7. **Copy Production Schema:**
   - Option A: Run migrations on sandbox project
     ```bash
     # Set sandbox Supabase URL/key temporarily
     npx supabase db push --project-ref your-sandbox-project-ref
     ```
   
   - Option B: Manual copy
     - Go to production Supabase → SQL Editor
     - Copy CREATE TABLE statements
     - Run on sandbox Supabase → SQL Editor

8. **Get Sandbox Credentials:**
   - Project Settings → API
   - Copy: `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy: `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 2: Create Sandbox Vercel Project

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard

2. **Add New Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository (same repo as production)
   - Project Name: `ecommerce-sandbox` (or `yourstore-sandbox`)

3. **Configure Build Settings:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (same as production)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Set Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add these variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-sandbox-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-sandbox-service-role-key
   INTEGRATION_USERNAME=test_erp_user
   INTEGRATION_PASSWORD=test_password_123
   INTEGRATION_API_KEY=your-sandbox-api-key
   ```

   **Important:** These are DIFFERENT from production!

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Get sandbox URL: `https://ecommerce-sandbox.vercel.app`

6. **Optional: Add Custom Domain:**
   - Settings → Domains
   - Add: `sandbox.yourstore.com`
   - Follow DNS setup instructions

---

### Step 3: Verify Production Project Settings

Make sure your **production** Vercel project has:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
INTEGRATION_USERNAME=prod_erp_user (or different)
INTEGRATION_PASSWORD=prod_secure_password
INTEGRATION_API_KEY=your-production-api-key
```

**Important:** Production uses production Supabase, sandbox uses sandbox Supabase!

---

## Deployment Workflow

### Sandbox Deployment:
1. Push code to GitHub (any branch)
2. Vercel sandbox project auto-deploys
3. Uses sandbox environment variables
4. Connects to sandbox Supabase
5. URL: `https://sandbox.yourstore.com`

### Production Deployment:
1. Push code to `main` branch (or production branch)
2. Vercel production project auto-deploys
3. Uses production environment variables
4. Connects to production Supabase
5. URL: `https://yourstore.com`

---

## Environment Variable Comparison

| Variable | Sandbox Project | Production Project |
|----------|----------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sandbox Supabase URL | Production Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Sandbox key | Production key |
| `INTEGRATION_USERNAME` | `test_erp_user` | `prod_erp_user` |
| `INTEGRATION_PASSWORD` | Test password | Production password |
| `INTEGRATION_API_KEY` | Test API key | Production API key |

**Key Point:** Same variable names, different values per project!

---

## Testing Flow

1. **Test in Sandbox:**
   - Enrico tests with sandbox URL + credentials
   - All test data goes to sandbox Supabase
   - Production unaffected

2. **When Ready:**
   - Enrico confirms sandbox works
   - Deploy same code to production
   - Share production URL + credentials

3. **Both Running:**
   - Sandbox: For testing new features
   - Production: For live ERP integration

---

## Alternative: Branch-Based Deployment

If you prefer branches:

### Setup:
1. **Sandbox Project:**
   - Deploy from `sandbox` branch
   - Environment: Sandbox variables

2. **Production Project:**
   - Deploy from `main` branch
   - Environment: Production variables

### Workflow:
```bash
# Work on sandbox
git checkout sandbox
# Make changes
git push origin sandbox
# Sandbox auto-deploys

# When ready for production
git checkout main
git merge sandbox
git push origin main
# Production auto-deploys
```

**Note:** This requires branch management, but keeps code separate.

---

## Troubleshooting

### Issue: Sandbox using production database
**Solution:** Check environment variables in Vercel sandbox project → Settings → Environment Variables

### Issue: Both projects deploying same code
**Solution:** This is correct! Same code, different configs. That's the point.

### Issue: Want to test code before production
**Solution:** 
- Test in sandbox first
- When ready, deploy to production (same code, different env vars)

### Issue: Need different code for sandbox
**Solution:** Use feature flags or environment checks:
```typescript
if (process.env.NEXT_PUBLIC_ENV === 'sandbox') {
  // Sandbox-specific code
}
```

---

## Best Practices

✅ **DO:**
- Use separate Supabase projects (sandbox vs production)
- Use separate Vercel projects
- Use different credentials per environment
- Test in sandbox before production
- Keep same codebase (no duplication)

❌ **DON'T:**
- Use production database for sandbox
- Share credentials between environments
- Deploy untested code to production
- Mix test and production data

---

## Summary

**Architecture:**
```
Same GitHub Repo
    ├── Vercel Sandbox Project → Sandbox URL → Sandbox Supabase
    └── Vercel Production Project → Production URL → Production Supabase
```

**Key Points:**
- ✅ Same codebase
- ✅ Different deployments
- ✅ Different databases
- ✅ Different credentials
- ✅ Independent testing

---

**END OF DEPLOYMENT STRATEGY**
