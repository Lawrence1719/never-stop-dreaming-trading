# Sandbox Testing Guide

**Date:** 2025-01-27  
**Purpose:** Step-by-step guide to test the sandbox API endpoints

---

## Your Sandbox URL

Based on the screenshot, your sandbox is deployed at:
```
https://never-stop-dreaming-trading.vercel.app
```

---

## Step 1: Test Authentication (Get Token)

### Using cURL:

```bash
curl -X POST https://never-stop-dreaming-trading.vercel.app/api/integration/user/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_erp_user",
    "password": "test_password_123"
  }'
```

### Using Postman/API Client:

1. **Method:** POST
2. **URL:** `https://never-stop-dreaming-trading.vercel.app/api/integration/user/refresh`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (raw JSON):**
   ```json
   {
     "username": "test_erp_user",
     "password": "test_password_123"
   }
   ```

### Expected Success Response (200):

```json
{
  "success": true,
  "data": {
    "token": "abc123def456ghi789..."
  },
  "status": 200
}
```

**Save the `token` value** - you'll need it for Step 2!

### Expected Error Response (401):

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

---

## Step 2: Test Order Creation (Using Token)

### Using cURL:

```bash
curl -X POST https://never-stop-dreaming-trading.vercel.app/api/integration/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_FROM_STEP_1" \
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

### Using Postman/API Client:

1. **Method:** POST
2. **URL:** `https://never-stop-dreaming-trading.vercel.app/api/integration/orders`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN_FROM_STEP_1`
4. **Body (raw JSON):**
   ```json
   {
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
   }
   ```

### Expected Success Response (200):

```json
{
  "success": true,
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Order created successfully",
  "reference": "TEST-001",
  "total": 91.84,
  "item_count": 1
}
```

### Expected Error Responses:

**401 Unauthorized (Invalid Token):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing API key or token"
}
```

**409 Duplicate (Same Invoice Number):**
```json
{
  "success": false,
  "error": "Duplicate order",
  "message": "Order with invoice number TEST-001 already exists",
  "order_id": "..."
}
```

---

## Step 3: Test Duplicate Prevention

Try sending the **same invoice** again (same `erp_invoice_number`):

```bash
curl -X POST https://never-stop-dreaming-trading.vercel.app/api/integration/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "retailer_br_id": 15750504,
    "erp_invoice_number": "TEST-001",
    ...
  }'
```

**Expected:** Should return 409 (Duplicate order)

---

## Quick Test Checklist

- [ ] **Step 1:** Get token from `/api/integration/user/refresh` ✅
- [ ] **Step 2:** Create order with token ✅
- [ ] **Step 3:** Try duplicate invoice (should fail) ✅
- [ ] **Step 4:** Try invalid token (should fail) ✅
- [ ] **Step 5:** Try invalid data (should return 400) ✅

---

## Testing with Browser (Simple)

You can also test the authentication endpoint directly in browser console:

```javascript
fetch('https://never-stop-dreaming-trading.vercel.app/api/integration/user/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'test_erp_user',
    password: 'test_password_123'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## What to Send Enrico

Once testing is successful, send Enrico:

```
Sandbox URL: https://never-stop-dreaming-trading.vercel.app
Username: test_erp_user
Password: test_password_123

Endpoints:
1. Get Token: POST https://never-stop-dreaming-trading.vercel.app/api/integration/user/refresh
   Body: { "username": "test_erp_user", "password": "test_password_123" }
   
2. Create Order: POST https://never-stop-dreaming-trading.vercel.app/api/integration/orders
   Headers: Authorization: Bearer <token_from_step_1>
   Body: { invoice JSON from API_INTEGRATION.md }
```

---

## Troubleshooting

### Issue: "Invalid username or password"
**Solution:** 
- Check environment variables in Vercel project settings
- Make sure `INTEGRATION_USERNAME` and `INTEGRATION_PASSWORD` are set
- Redeploy after adding environment variables

### Issue: "Invalid or missing API key or token"
**Solution:**
- Make sure you're using the token from Step 1
- Check token hasn't expired (24 hours)
- Verify `Authorization: Bearer <token>` header format

### Issue: "Missing Supabase configuration"
**Solution:**
- Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel
- Use sandbox Supabase project (not production)

---

**END OF TESTING GUIDE**
