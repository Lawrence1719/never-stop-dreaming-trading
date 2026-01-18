# Troubleshooting Order Status Update Errors

## Common Error: "Failed to update order status"

### Possible Causes

1. **Migrations Not Run**
   - The new columns (`paid_at`, `shipped_at`, `delivered_at`, `tracking_number`, `courier`) don't exist yet
   - The `order_status_history` table doesn't exist yet

2. **Database Constraint Issues**
   - Status constraint doesn't include the new status value
   - Foreign key constraint violation

3. **Permission Issues**
   - User is not authenticated
   - User is not an admin

### Solutions

#### Step 1: Run Required Migrations

```sql
-- Run these migrations in order:
-- 1. Add status columns
-- File: supabase/migrations/015_add_order_status_columns.sql

-- 2. Create status history table
-- File: supabase/migrations/016_create_order_status_history_table.sql

-- 3. Update status constraint (if not already done)
-- File: supabase/migrations/014_update_orders_status_constraint.sql
```

#### Step 2: Verify Migrations Ran Successfully

```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('paid_at', 'shipped_at', 'delivered_at', 'tracking_number', 'courier');

-- Check if status history table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'order_status_history';

-- Check status constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'orders_status_check';
```

#### Step 3: Check Server Logs

Look at the server console/logs for detailed error messages. The API now returns more detailed error information.

#### Step 4: Test API Directly

```bash
# Test with curl
curl -X PUT http://localhost:3000/api/admin/orders/{orderId}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "notes": "Test update"
  }'
```

### Error Messages Explained

**"Status is required"**
- The `status` field is missing from the request body

**"Invalid status"**
- The status value is not one of: pending, paid, processing, shipped, delivered, cancelled, duplicate

**"Invalid status transition"**
- Trying to change from a status to an invalid next status
- Example: Cannot change from "pending" directly to "shipped" (must go through "paid" and "processing" first)

**"Tracking number is required for shipped status"**
- When setting status to "shipped", tracking_number must be provided (minimum 3 characters)

**"Courier is required for shipped status"**
- When setting status to "shipped", courier must be provided

**"Order not found"**
- The order ID doesn't exist in the database

**"Unauthorized" or "Forbidden"**
- User is not logged in or not an admin

**"Failed to update order status"**
- Database error (check server logs for details)
- Could be missing columns, constraint violation, or other DB issue

### Quick Fix: Run Migrations

If you see "Failed to update order status", the most likely cause is missing migrations:

1. Go to Supabase SQL Editor
2. Run migration `015_add_order_status_columns.sql`
3. Run migration `016_create_order_status_history_table.sql`
4. Try updating status again

### Still Having Issues?

1. Check browser console for detailed error messages
2. Check server logs for database errors
3. Verify you're logged in as an admin
4. Verify the order exists
5. Try updating to a simple status first (e.g., pending → paid) before trying shipped









