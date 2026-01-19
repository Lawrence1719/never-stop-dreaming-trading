# Duplicate Order Prevention - Implementation Checklist

## Phase 1: Immediate Actions (Today)

### Database Cleanup

- [ ] **Run duplicate detection query**
  ```sql
  -- Run: supabase/queries/duplicate_orders_detection.sql
  ```

- [ ] **Review duplicate results**
  - Identify all duplicate pairs
  - Determine which order to keep (earlier one)
  - Verify payment status

- [ ] **Clean up duplicate order**
  ```sql
  -- For order: df2baf8f-1965-4fb9-87b5-3e7211736539
  UPDATE orders SET status = 'cancelled' 
  WHERE id = 'df2baf8f-1965-4fb9-87b5-3e7211736539';
  ```

- [ ] **Process refund if needed**
  - Check if customer was charged
  - Process refund for duplicate order
  - Document refund in system

- [ ] **Contact affected customer**
  - Use template from `docs/CUSTOMER_COMMUNICATION_TEMPLATE.md`
  - Send email to: madyydizon@gmail.com
  - Apologize and explain resolution

## Phase 2: Database Migrations (This Week)

### Migration Execution

- [ ] **Run migration 012: Add idempotency_key**
  ```bash
  # Via Supabase CLI
  supabase db push
  
  # Or via SQL Editor
  # Run: supabase/migrations/012_add_idempotency_key_to_orders.sql
  ```

- [ ] **Verify idempotency_key column exists**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'orders' 
    AND column_name = 'idempotency_key';
  ```

- [ ] **Verify index created**
  ```sql
  SELECT indexname 
  FROM pg_indexes 
  WHERE tablename = 'orders' 
    AND indexname = 'idx_orders_idempotency_key';
  ```

- [ ] **Run migration 013: Add duplicate detection trigger**
  ```bash
  # Run: supabase/migrations/013_add_duplicate_detection_trigger.sql
  ```

- [ ] **Verify trigger exists**
  ```sql
  SELECT trigger_name 
  FROM information_schema.triggers 
  WHERE trigger_name = 'trg_detect_duplicate_order';
  ```

- [ ] **Run migration 014: Update status constraint**
  ```bash
  # Run: supabase/migrations/014_update_orders_status_constraint.sql
  ```

- [ ] **Verify status constraint updated**
  ```sql
  SELECT constraint_name, check_clause
  FROM information_schema.check_constraints
  WHERE constraint_name = 'orders_status_check';
  -- Should include 'duplicate' in the list
  ```

## Phase 3: Application Deployment (This Week)

### Code Deployment

- [ ] **Deploy updated checkout page**
  - Button disabling implemented
  - Loading overlay added
  - Idempotency key generation working

- [ ] **Deploy new API endpoint**
  - `/api/orders/create` endpoint created
  - Idempotency key validation working
  - Error handling implemented

- [ ] **Test in staging environment**
  - Test double-click prevention
  - Test idempotency
  - Test error handling
  - Test loading states

## Phase 4: Testing (This Week)

### Functional Tests

- [ ] **Test 1: Double-click prevention**
  - Navigate to checkout
  - Fill in all information
  - Rapidly click "Place Order" twice
  - **Expected:** Only 1 order created, button disabled

- [ ] **Test 2: Idempotency**
  - Create order with key "TEST-123"
  - Create order again with same key "TEST-123"
  - **Expected:** Returns existing order, no duplicate

- [ ] **Test 3: Network retry**
  - Start order creation
  - Simulate network failure
  - Retry with same idempotency key
  - **Expected:** Returns original order

- [ ] **Test 4: Loading state**
  - Click "Place Order"
  - **Expected:** Button disabled, loading overlay shown
  - **Expected:** Cannot click again during processing

- [ ] **Test 5: Error handling**
  - Simulate error during order creation
  - **Expected:** Error message shown, button re-enabled
  - **Expected:** Can retry order creation

- [ ] **Test 6: Database trigger**
  - Manually insert duplicate order in database
  - **Expected:** Trigger marks as 'duplicate' status

## Phase 5: Monitoring Setup (Next Week)

### Monitoring Configuration

- [ ] **Set up daily duplicate detection**
  - Configure scheduled job in Supabase
  - Or set up cron job
  - Run: `supabase/queries/daily_duplicate_monitoring.sql`

- [ ] **Configure alerts**
  - Set up email alerts if duplicates found
  - Or Slack notifications
  - Test alert system

- [ ] **Create dashboard metric**
  - Track duplicate order rate
  - Should be 0% after implementation
  - Monitor weekly

## Phase 6: Documentation (This Week)

### Documentation Review

- [ ] **Review implementation docs**
  - `docs/DUPLICATE_ORDER_PREVENTION.md`
  - `docs/CUSTOMER_COMMUNICATION_TEMPLATE.md`
  - `docs/DUPLICATE_PREVENTION_CHECKLIST.md` (this file)

- [ ] **Update team documentation**
  - Share with development team
  - Share with customer service team
  - Share with operations team

## Phase 7: Customer Communication (Today)

### Immediate Actions

- [ ] **Contact Madeleine Dizon**
  - Email: madyydizon@gmail.com
  - Use template from `docs/CUSTOMER_COMMUNICATION_TEMPLATE.md`
  - Apologize for duplicate order
  - Explain what happened
  - Confirm refund processed
  - Reassure issue is fixed

- [ ] **Process refund**
  - Verify duplicate order amount: ₱210.00
  - Process refund if payment was charged
  - Document refund in system

- [ ] **Follow up**
  - Wait 3 days for customer response
  - Follow up if no response
  - Document customer communication

## Success Criteria

- ✅ All existing duplicates identified and cleaned
- ✅ Customer notified and refunded
- ✅ All migrations executed successfully
- ✅ Application code deployed
- ✅ All tests passing
- ✅ Monitoring set up
- ✅ Zero duplicate orders for 30 days
- ✅ Customer satisfaction maintained

## Rollback Plan

If issues occur:

1. **Disable trigger:**
   ```sql
   DROP TRIGGER trg_detect_duplicate_order ON orders;
   ```

2. **Make idempotency optional (temporary):**
   - Update API to allow orders without idempotency key
   - Keep button disabling (safe)

3. **Revert migrations (if critical):**
   ```sql
   ALTER TABLE orders DROP COLUMN idempotency_key;
   DROP INDEX idx_orders_idempotency_key;
   ```

## Notes

- Keep `shipping_address` JSONB column for historical reference
- Monitor duplicate detection query daily
- Review customer feedback weekly
- Update prevention strategies as needed












