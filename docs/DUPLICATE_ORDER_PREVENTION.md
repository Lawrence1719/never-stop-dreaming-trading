# Duplicate Order Prevention System

## Overview

This document describes the comprehensive duplicate order prevention system implemented for Never Stop Dreaming Trading. The system uses multiple layers of protection to prevent duplicate orders from being created.

## Problem Statement

Previously, customers could accidentally create duplicate orders by:
- Double-clicking the "Place Order" button
- Browser network retries
- Form auto-submission + manual click
- Race conditions from simultaneous requests

This resulted in customers being charged multiple times for the same order.

## Solution Architecture

The prevention system uses **four layers of protection**:

1. **Frontend Prevention** - Disable button during processing
2. **Idempotency Keys** - Unique keys prevent duplicate requests
3. **Backend Validation** - API checks for existing orders
4. **Database Triggers** - Safety net at database level

## Implementation Details

### Layer 1: Frontend Prevention

**Location:** `app/checkout/page.tsx`

**Features:**
- Button disabled immediately on click
- Loading spinner and "Processing Order..." message
- Prevents multiple clicks
- Re-enables only on error (for retry)

**Code:**
```typescript
const [isProcessingOrder, setIsProcessingOrder] = useState(false);

// Button is disabled when isProcessingOrder is true
// Shows loading spinner during processing
```

### Layer 2: Idempotency Keys

**Location:** `app/checkout/page.tsx` (generation) + `app/api/orders/create/route.ts` (validation)

**How it works:**
1. Frontend generates unique key: `{user_id}-{timestamp}-{random}`
2. Key sent in `Idempotency-Key` header
3. Backend checks if order with this key exists
4. If exists: Return existing order (no duplicate created)
5. If not: Create new order with this key

**Key Format:**
```
{user_id}-{timestamp}-{random_string}
Example: 11cc89b8-7dd9-4cc3-8044-ad52dcc6558f-1701234567890-abc123xyz
```

**Database:**
- Column: `idempotency_key TEXT UNIQUE`
- Index: `idx_orders_idempotency_key` for fast lookups

### Layer 3: Backend API Validation

**Location:** `app/api/orders/create/route.ts`

**Process:**
1. Extract `Idempotency-Key` from request header
2. Query database for existing order with this key
3. If found: Return existing order (200 OK, `duplicate: true`)
4. If not found: Create new order with key
5. Handle race conditions (concurrent requests)

**Response Format:**
```json
{
  "data": { /* order object */ },
  "duplicate": false,
  "message": "Order created successfully"
}
```

### Layer 4: Database Trigger

**Location:** `supabase/migrations/013_add_duplicate_detection_trigger.sql`

**Function:**
- Fires BEFORE INSERT on orders table
- Checks for orders from same user with same total within 5 seconds
- If duplicate found: Marks order as `status = 'duplicate'`
- Logs warning for monitoring

**Note:** This is a safety net. Idempotency keys should prevent most cases.

## Database Schema

### New Column

```sql
ALTER TABLE orders
ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX idx_orders_idempotency_key 
ON orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

### Updated Status Constraint

```sql
-- Now includes 'duplicate' status
CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled','duplicate'))
```

## Migration Files

1. **012_add_idempotency_key_to_orders.sql** - Adds idempotency_key column
2. **013_add_duplicate_detection_trigger.sql** - Adds database trigger
3. **014_update_orders_status_constraint.sql** - Updates status constraint

## Monitoring

### Daily Duplicate Detection Query

**Location:** `supabase/queries/daily_duplicate_monitoring.sql`

**Purpose:**
- Run daily at 2 AM
- Finds duplicates from last 24 hours
- Alerts if any duplicates found

**Setup:**
- Configure as scheduled job in Supabase
- Or use cron job to run query
- Send alerts via email/Slack if duplicates found

### Manual Detection Query

**Location:** `supabase/queries/duplicate_orders_detection.sql`

**Purpose:**
- Find all duplicate order pairs
- Shows which order to keep vs delete
- Useful for manual review

## Handling Existing Duplicates

### Step 1: Identify Duplicates

Run the detection query:
```sql
-- See supabase/queries/duplicate_orders_detection.sql
```

### Step 2: Review Each Duplicate

- Check which order was created first (keep this one)
- Verify payment status
- Check if customer was charged twice

### Step 3: Clean Up

**Option A: Mark as Cancelled (Recommended)**
```sql
UPDATE orders
SET status = 'cancelled'
WHERE id = '<duplicate_order_id>';
```

**Option B: Delete (Only if no payment processed)**
```sql
DELETE FROM orders
WHERE id = '<duplicate_order_id>';
```

### Step 4: Process Refund

If customer was charged:
1. Process refund for duplicate order
2. Keep original order active
3. Notify customer

### Step 5: Customer Communication

**Template:**
```
Subject: Duplicate Order Correction

Dear [Customer Name],

We noticed that a duplicate order was created in our system. 
We've automatically cancelled the duplicate order and processed 
a refund if payment was charged.

Your original order [Order Number] remains active and will be 
processed normally.

We apologize for any confusion. This issue has been fixed 
to prevent it from happening again.

Thank you for your understanding.

Best regards,
Never Stop Dreaming Team
```

## Testing

### Test 1: Double-Click Prevention

1. Navigate to checkout
2. Fill in all information
3. Rapidly click "Place Order" button twice
4. **Expected:** Only 1 order created, button disabled after first click

### Test 2: Idempotency

1. Make order creation request with key "TEST-123"
2. Verify order created
3. Make identical request with same key "TEST-123"
4. **Expected:** Returns existing order, no new order created

### Test 3: Network Retry

1. Start order creation
2. Simulate network failure
3. Retry request with same idempotency key
4. **Expected:** Returns original order, no duplicate

### Test 4: Concurrent Requests

1. Send two identical requests simultaneously
2. **Expected:** Only one order created, both requests return same order

## Rollback Plan

If issues occur:

1. **Disable trigger:**
   ```sql
   DROP TRIGGER trg_detect_duplicate_order ON orders;
   ```

2. **Remove idempotency requirement (temporary):**
   - Update API to make idempotency key optional
   - Keep button disabling (safe to keep)

3. **Revert migrations (if needed):**
   ```sql
   ALTER TABLE orders DROP COLUMN idempotency_key;
   DROP INDEX idx_orders_idempotency_key;
   ```

## Success Metrics

- **Duplicate Order Rate:** 0% (target)
- **Button Disabling:** 100% of orders
- **Idempotency Key Usage:** 100% of new orders
- **Customer Complaints:** 0 about duplicate charges

## Maintenance

### Weekly
- Review daily monitoring reports
- Check for any duplicates
- Verify trigger is working

### Monthly
- Review duplicate prevention effectiveness
- Update documentation if needed
- Check customer feedback

### Quarterly
- Analyze duplicate patterns (if any)
- Optimize queries if needed
- Review and update prevention strategies

## Support

For issues or questions:
1. Check application logs for idempotency key errors
2. Review database trigger logs
3. Check monitoring queries for duplicates
4. Verify API endpoint is receiving idempotency keys

## Related Files

- `app/checkout/page.tsx` - Frontend prevention
- `app/api/orders/create/route.ts` - Backend idempotency
- `supabase/migrations/012_add_idempotency_key_to_orders.sql` - Schema
- `supabase/migrations/013_add_duplicate_detection_trigger.sql` - Trigger
- `supabase/queries/duplicate_orders_detection.sql` - Detection query
- `supabase/queries/daily_duplicate_monitoring.sql` - Monitoring query









