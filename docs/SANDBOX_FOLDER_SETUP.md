# Sandbox Folder Setup Guide

**Date:** 2025-01-27  
**Purpose:** Guide for using separate `sandbox/` folder in same GitHub repository

---

## Folder Structure

```
never-stop-dreaming-trading/
├── app/                    # Production e-commerce app
├── components/             # Production components
├── lib/                    # Production libraries
├── sandbox/               # Sandbox/test environment
│   ├── app/
│   │   └── api/
│   │       └── integration/
│   │           ├── auth/
│   │           ├── user/refresh/
│   │           └── orders/
│   ├── lib/
│   │   └── integration/
│   │       └── token-store.ts
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── .env.local
└── package.json           # Root package.json (production)
```

---

## Setup Steps

### Step 1: Install Dependencies in Sandbox

```bash
cd sandbox
npm install
```

### Step 2: Create Environment File

Create `sandbox/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-sandbox-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-sandbox-service-role-key
INTEGRATION_USERNAME=test_erp_user
INTEGRATION_PASSWORD=test_password_123
INTEGRATION_API_KEY=your-sandbox-api-key
```

### Step 3: Run Sandbox Locally

```bash
cd sandbox
npm run dev
```

- Sandbox runs on **port 3001** (production runs on 3000)
- Access at: `http://localhost:3001`

---

## Vercel Deployment Setup

### Production Project (Root Folder)

1. **Vercel Project Settings:**
   - Root Directory: `./` (or leave empty)
   - Build Command: `npm run build`
   - Output Directory: `.next`

2. **Environment Variables:**
   - Production Supabase credentials
   - Production API keys

### Sandbox Project (Sandbox Folder)

1. **Create New Vercel Project:**
   - Import same GitHub repository
   - Name: `your-project-sandbox`

2. **Vercel Project Settings:**
   - **Root Directory:** `sandbox` ⚠️ **IMPORTANT!**
   - Build Command: `npm run build` (runs in sandbox folder)
   - Output Directory: `.next`

3. **Environment Variables:**
   - Sandbox Supabase credentials
   - Test username/password
   - Sandbox API keys

---

## How It Works

### Same Repository, Different Folders

- **Production:** Deploys from root folder (`./`)
- **Sandbox:** Deploys from `sandbox/` folder
- **Same codebase:** Both in same GitHub repo
- **Different configs:** Different environment variables

### Development

**Run Production:**
```bash
npm run dev
# Runs on http://localhost:3000
```

**Run Sandbox:**
```bash
cd sandbox
npm run dev
# Runs on http://localhost:3001
```

---

## Testing

### Test Sandbox Locally

1. **Start sandbox:**
   ```bash
   cd sandbox
   npm run dev
   ```

2. **Test authentication:**
   ```bash
   curl -X POST http://localhost:3001/api/integration/user/refresh \
     -H "Content-Type: application/json" \
     -d '{
       "username": "test_erp_user",
       "password": "test_password_123"
     }'
   ```

3. **Test orders endpoint:**
   ```bash
   curl -X POST http://localhost:3001/api/integration/orders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{ ... invoice data ... }'
   ```

### Test Sandbox Deployment

1. **Deploy to Vercel** (with Root Directory = `sandbox`)
2. **Get sandbox URL:** `https://your-project-sandbox.vercel.app`
3. **Test endpoints** using sandbox URL

---

## Benefits of This Approach

✅ **Separate code:** Sandbox code isolated in `sandbox/` folder  
✅ **Same repo:** Easy to share code between production and sandbox  
✅ **Independent:** Can modify sandbox without affecting production  
✅ **Easy testing:** Test in sandbox before deploying to production  
✅ **Clear separation:** Easy to see what's sandbox vs production  

---

## Important Notes

⚠️ **Root Directory in Vercel:**
- Production: Leave empty or set to `./`
- Sandbox: **Must set to `sandbox`**

⚠️ **Environment Variables:**
- Production: Use production Supabase
- Sandbox: Use sandbox Supabase
- **Different values for each project!**

⚠️ **Ports:**
- Production: Port 3000 (default)
- Sandbox: Port 3001 (configured in package.json)

---

## Troubleshooting

### Issue: "Cannot find module" in sandbox
**Solution:** Make sure you ran `npm install` in `sandbox/` folder

### Issue: Vercel deployment fails
**Solution:** Check Root Directory is set to `sandbox` in Vercel project settings

### Issue: Sandbox using production database
**Solution:** Check environment variables in Vercel sandbox project

### Issue: Port already in use
**Solution:** Sandbox uses port 3001, production uses 3000. Make sure both aren't running.

---

## Next Steps

1. ✅ Install dependencies: `cd sandbox && npm install`
2. ✅ Create `.env.local` with sandbox credentials
3. ✅ Test locally: `npm run dev` (in sandbox folder)
4. ✅ Deploy to Vercel with Root Directory = `sandbox`
5. ✅ Share sandbox URL + credentials with Enrico

---

**END OF SETUP GUIDE**
