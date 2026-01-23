# Vercel Project Setup Guide

**Date:** 2025-01-27  
**Purpose:** Step-by-step guide to create Vercel projects for production and sandbox

---

## Prerequisites

Before creating Vercel projects, make sure you have:

1. ✅ **GitHub Repository** with your code
   - Code is pushed to GitHub
   - Repository is accessible

2. ✅ **Supabase Projects** (both production and sandbox)
   - Production Supabase project created
   - Sandbox Supabase project created
   - Have credentials ready (URLs and keys)

3. ✅ **Vercel Account**
   - Sign up at https://vercel.com
   - Connect your GitHub account

---

## Step 1: Create Production Vercel Project

### 1.1 Go to Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Sign in (or create account if needed)
3. Connect GitHub account if not already connected

### 1.2 Add New Project

1. Click **"Add New..."** button (top right)
2. Select **"Project"**
3. You'll see your GitHub repositories

### 1.3 Import Repository

1. **Find your repository** in the list
   - Search if you have many repos
   - Should see: `never-stop-dreaming-trading` (or your repo name)

2. **Click "Import"** next to your repository

### 1.4 Configure Project

**Project Name:**
```
yourstore-ecommerce
```
(or any name you prefer - this is just for Vercel dashboard)

**Framework Preset:**
- Should auto-detect: **Next.js**
- If not, select **Next.js** manually

**Root Directory:**
```
./
```
(Leave as default - means root of repository)

**Build and Output Settings:**
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

**Environment Variables:**
- **DON'T add yet** - we'll do this after project is created
- Click **"Deploy"** first

### 1.5 Deploy Project

1. Click **"Deploy"** button
2. Wait for deployment (2-5 minutes)
3. You'll see build logs in real-time
4. When done, you'll get a URL like: `https://yourstore-ecommerce.vercel.app`

### 1.6 Set Production Environment Variables

1. Go to **Project Settings** (gear icon)
2. Click **"Environment Variables"** (left sidebar)
3. Click **"Add New"** for each variable:

**Add these variables:**

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-production-project.supabase.co
Environment: Production, Preview, Development (select all)

Name: SUPABASE_SERVICE_ROLE_KEY
Value: your-production-service-role-key
Environment: Production, Preview, Development (select all)

Name: INTEGRATION_API_KEY
Value: your-production-api-key
Environment: Production, Preview, Development (select all)

Name: INTEGRATION_USERNAME
Value: prod_erp_user (or your production username)
Environment: Production, Preview, Development (select all)

Name: INTEGRATION_PASSWORD
Value: your-secure-production-password
Environment: Production, Preview, Development (select all)
```

**Important:** 
- Replace values with your actual production credentials
- Select all environments (Production, Preview, Development)
- Click "Save" after each variable

4. **Redeploy** after adding variables:
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### 1.7 (Optional) Add Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain: `yourstore.com`
4. Follow DNS setup instructions
5. Wait for DNS propagation (can take up to 24 hours)

---

## Step 2: Create Sandbox Vercel Project

### 2.1 Add Another Project

1. Go back to Vercel Dashboard
2. Click **"Add New..."** → **"Project"**
3. **Import the SAME repository** (yes, same repo!)

### 2.2 Configure Sandbox Project

**Project Name:**
```
yourstore-sandbox
```
(or `yourstore-ecommerce-sandbox`)

**Framework Preset:**
- **Next.js** (same as production)

**Root Directory:**
```
./
```
(same as production)

**Build Settings:**
- Same as production (defaults are fine)

**Click "Deploy"**

### 2.3 Set Sandbox Environment Variables

1. After deployment, go to **Settings** → **Environment Variables**
2. Add **DIFFERENT** values (sandbox credentials):

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-sandbox-project.supabase.co
Environment: Production, Preview, Development (select all)

Name: SUPABASE_SERVICE_ROLE_KEY
Value: your-sandbox-service-role-key
Environment: Production, Preview, Development (select all)

Name: INTEGRATION_API_KEY
Value: your-sandbox-api-key
Environment: Production, Preview, Development (select all)

Name: INTEGRATION_USERNAME
Value: test_erp_user
Environment: Production, Preview, Development (select all)

Name: INTEGRATION_PASSWORD
Value: test_password_123
Environment: Production, Preview, Development (select all)
```

**Important:**
- These are **DIFFERENT** from production!
- Sandbox uses sandbox Supabase
- Sandbox uses test credentials

3. **Redeploy** after adding variables

### 2.4 (Optional) Add Sandbox Domain

1. Settings → Domains
2. Add: `sandbox.yourstore.com`
3. Follow DNS setup

---

## Summary: What You'll Have

### Production Project:
- **Name:** `yourstore-ecommerce`
- **URL:** `https://yourstore-ecommerce.vercel.app` (or custom domain)
- **Database:** Production Supabase
- **Credentials:** Production credentials

### Sandbox Project:
- **Name:** `yourstore-sandbox`
- **URL:** `https://yourstore-sandbox.vercel.app` (or custom domain)
- **Database:** Sandbox Supabase
- **Credentials:** Test credentials

**Both use the same codebase, different configurations!**

---

## Quick Checklist

### Before Creating Projects:
- [ ] Code pushed to GitHub
- [ ] Production Supabase project created
- [ ] Sandbox Supabase project created
- [ ] Have all credentials ready

### Production Project:
- [ ] Created Vercel project
- [ ] Deployed successfully
- [ ] Added production environment variables
- [ ] Redeployed with variables
- [ ] (Optional) Added custom domain

### Sandbox Project:
- [ ] Created second Vercel project (same repo)
- [ ] Deployed successfully
- [ ] Added sandbox environment variables
- [ ] Redeployed with variables
- [ ] (Optional) Added sandbox domain

---

## Common Issues

### Issue: "Repository not found"
**Solution:** 
- Make sure GitHub account is connected to Vercel
- Check repository is public or you've granted Vercel access

### Issue: "Build failed"
**Solution:**
- Check build logs for errors
- Make sure `package.json` has correct scripts
- Verify all dependencies are in `package.json`

### Issue: "Environment variables not working"
**Solution:**
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Issue: "Can't find repository"
**Solution:**
- Click "Adjust GitHub App Permissions"
- Grant access to your repository
- Refresh page

---

## Next Steps After Setup

1. **Test Production:**
   - Visit production URL
   - Verify site loads
   - Test API endpoints

2. **Test Sandbox:**
   - Visit sandbox URL
   - Test authentication: `POST /api/integration/user/refresh`
   - Test orders: `POST /api/integration/orders`

3. **Share Sandbox Credentials:**
   - Send Enrico: Sandbox URL + Username + Password
   - Let them test integration

4. **When Ready:**
   - Share production credentials
   - Go live!

---

**END OF VERCEL SETUP GUIDE**
