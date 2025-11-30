# Shipping Address Normalization - Migration Checklist

## Pre-Migration

- [ ] **Backup Database**
  - Create full database backup
  - Test restore procedure
  - Document backup location and timestamp

- [ ] **Review Current Data**
  ```sql
  -- Count orders with JSON addresses
  SELECT COUNT(*) FROM orders WHERE shipping_address IS NOT NULL;
  
  -- Check for NULL user_ids
  SELECT COUNT(*) FROM orders WHERE user_id IS NULL AND shipping_address IS NOT NULL;
  
  -- Sample some address data to verify structure
  SELECT shipping_address FROM orders WHERE shipping_address IS NOT NULL LIMIT 5;
  ```

- [ ] **Test on Staging**
  - Deploy migrations to staging environment
  - Run data migration script
  - Verify all orders migrated successfully
  - Test order creation flow
  - Test order retrieval

## Migration Execution

### Step 1: Schema Migrations

- [ ] **Run `009_create_addresses_table.sql`**
  ```bash
  # Via Supabase CLI
  supabase db push
  
  # Or via SQL Editor
  # Copy and paste migration file content
  ```

- [ ] **Verify addresses table created**
  ```sql
  SELECT * FROM addresses LIMIT 1;
  -- Should return empty result set (no error)
  ```

- [ ] **Run `010_add_shipping_address_id_to_orders.sql`**
  ```bash
  # Via Supabase CLI or SQL Editor
  ```

- [ ] **Verify columns added**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'orders' 
    AND column_name IN ('shipping_address_id', 'billing_address_id');
  ```

### Step 2: Data Migration

- [ ] **Run `011_migrate_shipping_addresses.sql`**
  ```bash
  # Via SQL Editor (recommended for data migrations)
  # Monitor output for progress and errors
  ```

- [ ] **Verify migration results**
  ```sql
  -- Check migration success
  SELECT 
    COUNT(*) as total_orders,
    COUNT(shipping_address_id) as orders_with_fk,
    COUNT(*) FILTER (WHERE shipping_address IS NOT NULL AND shipping_address_id IS NULL) as unmigrated
  FROM orders;
  
  -- Should show: unmigrated = 0
  ```

- [ ] **Validate address records created**
  ```sql
  SELECT COUNT(*) FROM addresses;
  -- Should match number of unique addresses from orders
  ```

- [ ] **Check for duplicate addresses**
  ```sql
  SELECT user_id, full_name, street_address, city, province, zip_code, COUNT(*)
  FROM addresses
  GROUP BY user_id, full_name, street_address, city, province, zip_code
  HAVING COUNT(*) > 1;
  -- Review if duplicates are expected (same user, same address)
  ```

### Step 3: Application Deployment

- [ ] **Deploy updated code**
  - Checkout page updates
  - API route updates
  - No breaking changes to frontend components

- [ ] **Test order creation**
  - Create test order with new address
  - Verify address saved to `addresses` table
  - Verify order has `shipping_address_id` set
  - Verify order does NOT have `shipping_address` JSON

- [ ] **Test order retrieval**
  - Fetch orders via API
  - Verify shipping address displays correctly
  - Check both new and legacy orders

- [ ] **Test address selection**
  - Select existing address during checkout
  - Create new address during checkout
  - Set address as default

## Post-Migration Validation

- [ ] **Data Integrity Checks**
  ```sql
  -- All orders with shipping_address should have shipping_address_id
  SELECT COUNT(*) 
  FROM orders 
  WHERE shipping_address IS NOT NULL 
    AND shipping_address_id IS NULL;
  -- Should be 0

  -- All shipping_address_id values reference valid addresses
  SELECT COUNT(*) 
  FROM orders o
  LEFT JOIN addresses a ON o.shipping_address_id = a.id
  WHERE o.shipping_address_id IS NOT NULL 
    AND a.id IS NULL;
  -- Should be 0

  -- Verify user_id matches between orders and addresses
  SELECT COUNT(*) 
  FROM orders o
  JOIN addresses a ON o.shipping_address_id = a.id
  WHERE o.user_id != a.user_id;
  -- Should be 0 (unless business logic allows otherwise)
  ```

- [ ] **Performance Testing**
  - Test order listing query performance
  - Compare before/after query times
  - Verify indexes are being used

- [ ] **Functional Testing**
  - [ ] User can create new order
  - [ ] User can view order history
  - [ ] User can view order details
  - [ ] Admin can view all orders
  - [ ] Address management works correctly

## Rollback Preparation

- [ ] **Document rollback steps**
  - Backup location documented
  - Rollback SQL script prepared (if needed)
  - Communication plan for users

- [ ] **Test rollback procedure** (on staging)
  - Restore from backup
  - Verify data integrity
  - Test application functionality

## Monitoring

- [ ] **Set up monitoring**
  - Monitor error rates after deployment
  - Watch for NULL shipping_address_id in new orders
  - Monitor query performance

- [ ] **Review logs**
  - Check application logs for errors
  - Review database logs for constraint violations
  - Monitor user reports

## Post-Migration Cleanup (Optional - After Grace Period)

- [ ] **Archive old data** (after 30-90 days)
  - Consider moving `shipping_address` JSON to archive table
  - Or keep for historical reference

- [ ] **Make shipping_address_id NOT NULL** (after all legacy data migrated)
  ```sql
  ALTER TABLE orders
  ALTER COLUMN shipping_address_id SET NOT NULL;
  ```

- [ ] **Remove shipping_address column** (only if business requirements allow)
  ```sql
  -- NOT RECOMMENDED - Keep for historical reference
  -- ALTER TABLE orders DROP COLUMN shipping_address;
  ```

## Success Criteria

✅ All existing orders have `shipping_address_id` set (where `shipping_address` was not NULL)  
✅ All new orders use `shipping_address_id` (not JSON)  
✅ No data loss during migration  
✅ Application queries use JOINs instead of JSON parsing  
✅ Query performance improved or maintained  
✅ All tests pass  
✅ Zero errors in production logs  
✅ User-facing functionality works correctly  

## Notes

- Migration script handles edge cases and provides detailed logging
- Legacy orders can still be read from JSON if needed
- `shipping_address` column is preserved for historical reference
- Foreign key constraints ensure data integrity going forward



