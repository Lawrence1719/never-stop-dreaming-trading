# Shipping Address Database Normalization - Migration Guide

## Overview

This document describes the migration from storing shipping addresses as JSON in the `orders` table to a normalized approach using the `addresses` table with foreign key relationships.

## Problem Statement

Previously, shipping addresses were stored as JSONB directly in the `orders.shipping_address` column, while the `orders.shipping_address_id` foreign key column remained NULL. This created:
- Data redundancy
- Difficulty in querying and updating addresses
- No referential integrity
- Performance issues with JSON parsing

## Solution

We've normalized the database by:
1. Creating an `addresses` table to store all user addresses
2. Adding `shipping_address_id` foreign key to `orders` table
3. Migrating existing JSON addresses to the `addresses` table
4. Updating application code to use the normalized structure

## Migration Files

### 1. `009_create_addresses_table.sql`
Creates the `addresses` table with:
- User relationship via `user_id` FK to `auth.users`
- Address fields: `full_name`, `email`, `phone`, `street_address`, `city`, `province`, `zip_code`
- `address_type` (default: 'shipping')
- `is_default` flag with trigger to ensure only one default per user
- RLS policies for user access control

### 2. `010_add_shipping_address_id_to_orders.sql`
Adds:
- `shipping_address_id` column with FK to `addresses.id`
- `billing_address_id` column (for future use)
- Indexes for performance

### 3. `011_migrate_shipping_addresses.sql`
Data migration script that:
- Extracts shipping address data from `orders.shipping_address` JSONB
- Creates address records in `addresses` table
- Updates `orders.shipping_address_id` with new address IDs
- Handles duplicate addresses intelligently
- Validates migration success

## Migration Steps

### Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify all required fields are present in existing orders
- [ ] Review migration script for your specific data patterns

### Execution Order

1. **Run schema migrations:**
   ```bash
   # In Supabase SQL Editor or via CLI
   supabase db push
   # Or run manually:
   # 009_create_addresses_table.sql
   # 010_add_shipping_address_id_to_orders.sql
   ```

2. **Run data migration:**
   ```bash
   # 011_migrate_shipping_addresses.sql
   ```

3. **Verify migration:**
   ```sql
   -- Check for orders with NULL shipping_address_id
   SELECT COUNT(*) 
   FROM orders 
   WHERE shipping_address IS NOT NULL 
     AND shipping_address_id IS NULL;
   
   -- Should return 0 after successful migration
   ```

4. **Deploy application code updates:**
   - Updated checkout page
   - Updated API routes
   - Test order creation flow

### Post-Migration Validation

- [ ] All orders have non-NULL `shipping_address_id` (where `shipping_address` was not NULL)
- [ ] All `shipping_address_id` values reference valid `addresses` records
- [ ] New orders are created with `shipping_address_id` (not JSON)
- [ ] API queries use JOINs instead of JSON parsing
- [ ] No data loss during migration

## Application Code Changes

### Checkout Flow (Before)
```typescript
// ❌ Old: Stored JSON directly
await supabase.from('orders').insert({
  shipping_address: JSON.stringify(addressData),
  shipping_address_id: null
});
```

### Checkout Flow (After)
```typescript
// ✅ New: Uses addresses table
// 1. Create/get address
const { data: address } = await supabase
  .from('addresses')
  .insert({ ...addressData })
  .select()
  .single();

// 2. Create order with FK reference
await supabase.from('orders').insert({
  shipping_address_id: address.id
  // No shipping_address JSON
});
```

### API Queries (Before)
```typescript
// ❌ Old: Parsed JSON
const shippingAddress = row.shipping_address || {};
```

### API Queries (After)
```typescript
// ✅ New: Uses JOIN
const { data } = await supabase
  .from('orders')
  .select('*, shipping_address:addresses!shipping_address_id(*)')
  .eq('user_id', userId);
```

## Rollback Plan

If migration fails:

1. **Restore from backup** (recommended)
2. **Or manually revert:**
   ```sql
   -- Revert orders to NULL shipping_address_id
   UPDATE orders SET shipping_address_id = NULL;
   -- Note: shipping_address JSONB column still contains original data
   ```

## Future Enhancements

- Make `shipping_address_id` NOT NULL after all legacy data is migrated
- Add `shipping_method` column to `orders` table (currently stored in JSON)
- Implement address validation API integration
- Add address history/versioning
- Support billing addresses separately

## Performance Improvements

**Before:**
- JSON parsing on every query
- No indexing on address fields
- Complex queries for address-based filtering

**After:**
- Direct column access via JOIN
- Indexed foreign keys
- Simple SQL queries with JOINs
- Better query optimization

## Notes

- The `shipping_address` JSONB column is **NOT removed** to preserve historical data
- Legacy orders can still be read from JSON if needed
- New orders should always use `shipping_address_id`
- Consider archiving `shipping_address` column after a grace period

## Support

For issues or questions:
1. Check migration logs in Supabase
2. Review validation queries in migration script
3. Verify RLS policies are correctly configured
4. Ensure foreign key constraints are in place









