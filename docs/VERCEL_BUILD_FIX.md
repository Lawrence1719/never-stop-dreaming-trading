# Fix Vercel Build Error: Missing Environment Variables

**Error:** `Supabase environment variables are not set`  
**Solution:** Add environment variables in Vercel project settings

---

## Quick Fix Steps

### 1. Go to Vercel Project Settings

1. Open your Vercel project
2. Click **Settings** (gear icon)
3. Click **Environment Variables** (left sidebar)

### 2. Add Required Variables

Click **"Add New"** for each variable below:

#### Required Supabase Variables:

**Variable 1:**
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project-id.supabase.co
Environment: ☑ Production ☑ Preview ☑ Development
```

**Variable 2:**
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
Environment: ☑ Production ☑ Preview ☑ Development
```

**Variable 3:**
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service role key)
Environment: ☑ Production ☑ Preview ☑ Development
```

#### Integration Variables:

**Variable 4:**
```
Name: INTEGRATION_USERNAME
Value: test_erp_user
Environment: ☑ Production ☑ Preview ☑ Development
```

**Variable 5:**
```
Name: INTEGRATION_PASSWORD
Value: your_secure_password_here
Environment: ☑ Production ☑ Preview ☑ Development
```

**Variable 6 (Optional):**
```
Name: INTEGRATION_API_KEY
Value: your_api_key_here
Environment: ☑ Production ☑ Preview ☑ Development
```

**Important:** 
- ✅ Select ALL environments (Production, Preview, Development)
- ✅ Click "Save" after each variable
- ✅ Use your actual Supabase credentials (not placeholders)

### 3. Find Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 4. Redeploy

1. Go to **Deployments** tab
2. Find the failed deployment
3. Click **"..."** (three dots)
4. Click **"Redeploy"**
5. Wait for build to complete (should succeed now!)

---

## Common Mistakes

❌ **Wrong:** Only selected "Production" environment  
✅ **Correct:** Select all (Production, Preview, Development)

❌ **Wrong:** Used placeholder values  
✅ **Correct:** Use actual Supabase credentials

❌ **Wrong:** Forgot to redeploy after adding variables  
✅ **Correct:** Must redeploy for variables to take effect

❌ **Wrong:** Typo in variable name  
✅ **Correct:** Copy-paste exact names (case-sensitive)

---

## Verify Variables Are Set

After redeploy, check build logs:
- Should NOT see: "Supabase environment variables are not set"
- Should see: "✓ Compiled successfully"

---

**END OF FIX GUIDE**
