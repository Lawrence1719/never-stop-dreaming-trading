# Sandbox Setup Instructions

**Date:** 2025-01-27  
**Purpose:** Step-by-step guide to set up sandbox environment for ERP integration testing

---

## What Was Created

✅ **Authentication Endpoint** (`/api/integration/auth` and `/api/integration/user/refresh`)
- Accepts username/password
- Returns token (similar to BeatRoute format)
- Token expires after 24 hours

✅ **Updated Orders Endpoint** (`/api/integration/orders`)
- Now supports BOTH authentication methods:
  - API key (Bearer token) - existing
  - Username/password token - new

✅ **Token Storage** (`lib/integration/token-store.ts`)
- In-memory token storage (for sandbox)
- Auto-expires tokens after 24 hours
- Can be replaced with Redis/database for production

---

## Step 1: Set Up Environment Variables

### Option A: For Local Testing (`.env.development`)

Create `.env.development` file (Next.js auto-loads this in dev mode):

```env
# Test/Sandbox Supabase config
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key

# Integration API Key (for direct API key auth - optional)
INTEGRATION_API_KEY=your-test-api-key-here

# Username/Password for sandbox (REQUIRED for token auth)
INTEGRATION_USERNAME=test_erp_user
INTEGRATION_PASSWORD=test_password_123

# Or use these alternative names (both work)
# INTEGRATION_TEST_USERNAME=test_erp_user
# INTEGRATION_TEST_PASSWORD=test_password_123
```
    
**Note:** 
- `.env.development` is automatically loaded when running `npm run dev`
- Keep `.env.local` for production/local development
- Use **test/sandbox Supabase project** (not production)
- Generate secure password for `INTEGRATION_PASSWORD`
- Keep credentials secure (don't commit to git - add to `.gitignore`)

### Option B: For Deployment (Vercel/Railway/etc.) - Recommended

Set environment variables in your deployment platform:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-test-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-test-key`
   - `INTEGRATION_USERNAME` = `test_erp_user`
   - `INTEGRATION_PASSWORD` = `test_password_123`
   - `INTEGRATION_API_KEY` = `your-test-api-key` (optional)

**Benefits:**
- No `.env` file needed
- Different values for sandbox vs production
- Secure (not in code repository)

---

## Step 2: Set Up Test Supabase Project

### Option A: Create New Supabase Project (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project (e.g., "E-commerce Sandbox")
3. Copy the same database schema from production:
   - Run migrations on test project
   - Or manually create tables: `orders`, `order_items`, `products`, etc.
4. Use test data (not production data)

### Option B: Use Existing Project with Test Data

1. Use existing Supabase project
2. Make sure test data is separate
3. Consider using table prefixes (e.g., `test_orders`) if needed

---

## Step 3: Deploy to Sandbox URL

### Option A: Vercel (Recommended)

1. **Create new Vercel project:**
   - Go to Vercel dashboard
   - Create new project from same repository
   - Use different branch (e.g., `sandbox` or `test`)

2. **Set environment variables:**
   - Go to Project Settings → Environment Variables
   - Add all variables from Step 1
   - Deploy

3. **Get sandbox URL:**
   - Vercel will give you: `https://your-project-sandbox.vercel.app`
   - Or use custom domain: `https://sandbox.yourstore.com`

### Option B: Local Development + ngrok

1. **Run locally:**
   ```bash
   npm run dev
   ```

2. **Expose with ngrok:**
   ```bash
   ngrok http 3000
   ```
   - Get public URL: `https://abc123.ngrok.io`

3. **Use ngrok URL as sandbox URL**

### Option C: Separate Deployment

- Deploy to separate hosting (Railway, Render, etc.)
- Use sandbox subdomain

---

## Step 4: Test the Endpoints

### Test 1: Authentication (Get Token)

**Request:**
```bash
curl -X POST https://sandbox.yourstore.com/api/integration/user/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_erp_user",
    "password": "test_password_123"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "abc123def456..."
  },
  "status": 200
}
```

**Expected Response (401 - Wrong Credentials):**
```json
{
  "success": false,
  "data": {
    "name": "Unauthorized",
    "message": "Invalid username or password",
    "code": 0,
    "status": 401
  },
  "status": 401
}
```

### Test 2: Create Order (Using Token)

**Request:**
```bash
curl -X POST https://sandbox.yourstore.com/api/integration/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_FROM_TEST_1" \
  -d '{
    "retailer_br_id": 15750504,
    "erp_invoice_number": "TEST-001",
    "invoice_date": "2025-01-27",
    "status": 1,
    "remarks": "",
    "customFields": [
      {"id": "1128", "value": "TEST USER"},
      {"id": "", "value": ""},
      {"id": "", "value": ""}
    ],
    "details": [
      {
        "sku_external_id": "000005011200217250",
        "quantity": "1",
        "sku_uom": "PCK",
        "price_per_item": 91.8393,
        "discount_value": 0.0000
      }
    ]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "order_id": "...",
  "message": "Order created successfully",
  "reference": "TEST-001",
  "total": 91.84,
  "item_count": 1
}
```

---

## Step 5: Provide Credentials to Enrico

Send Enrico these details:

```
Sandbox URL: https://sandbox.yourstore.com (or your actual sandbox URL)
Username: test_erp_user
Password: test_password_123

Endpoints:
1. Get Token: POST https://sandbox.yourstore.com/api/integration/user/refresh
   Body: { "username": "test_erp_user", "password": "test_password_123" }
   
2. Create Order: POST https://sandbox.yourstore.com/api/integration/orders
   Headers: Authorization: Bearer <token_from_step_1>
   Body: { invoice JSON }
```

---

## Troubleshooting

### Issue: "INTEGRATION_USERNAME environment variable not set"
**Solution:** 
- For local: Make sure `.env.development` has `INTEGRATION_USERNAME` and `INTEGRATION_PASSWORD` set
- For deployment: Check environment variables are set in deployment platform (Vercel, etc.)
- Restart dev server after adding to `.env.development`

### Issue: "Invalid username or password"
**Solution:** 
- Check environment variables are loaded (restart dev server)
- Verify username/password match exactly (case-sensitive)

### Issue: "Invalid or missing API key or token"
**Solution:**
- Make sure token is from `/api/integration/user/refresh` endpoint
- Check token hasn't expired (24 hours)
- Verify `Authorization: Bearer <token>` header format

### Issue: Database errors
**Solution:**
- Verify Supabase URL and service role key are correct
- Check test database has required tables (`orders`, `order_items`)
- Run migrations on test database

---

## Next Steps After Testing

1. **If sandbox works:**
   - Enrico confirms testing successful
   - Deploy same code to production
   - Use production Supabase project
   - Generate production credentials

2. **If changes needed:**
   - Update code based on feedback
   - Re-test in sandbox
   - Repeat until ready for production

3. **Production setup:**
   - Use production environment variables
   - Use production Supabase project
   - Generate secure production credentials
   - Share production URL + credentials with Enrico

---

## Security Notes

⚠️ **For Sandbox:**
- Test credentials are okay (but still keep secure)
- In-memory token storage is fine for testing

⚠️ **For Production:**
- Use strong, unique passwords
- Consider Redis/database for token storage (not in-memory)
- Implement token rotation
- Add rate limiting
- Add IP whitelisting (if ERP has fixed IPs)
- Monitor authentication attempts

---

**END OF SETUP INSTRUCTIONS**
