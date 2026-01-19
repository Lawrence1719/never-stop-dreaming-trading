-- 011_migrate_shipping_addresses.sql
-- Data migration: Move shipping addresses from JSON to addresses table
-- 
-- IMPORTANT: Run this migration AFTER:
--   1. 009_create_addresses_table.sql
--   2. 010_add_shipping_address_id_to_orders.sql
--
-- This script:
--   1. Extracts shipping address data from orders.shipping_address JSONB
--   2. Creates address records in addresses table
--   3. Updates orders.shipping_address_id with the new address IDs
--   4. Validates migration success
--
-- ROLLBACK: If migration fails, the shipping_address JSONB column still contains original data

DO $$
DECLARE
  order_record RECORD;
  address_id UUID;
  migrated_count INTEGER := 0;
  error_count INTEGER := 0;
  address_data JSONB;
  existing_address_id UUID;
BEGIN
  -- Loop through all orders that have shipping_address JSON but no shipping_address_id
  FOR order_record IN 
    SELECT 
      id,
      user_id,
      shipping_address,
      shipping_address_id
    FROM public.orders
    WHERE shipping_address IS NOT NULL
      AND (shipping_address_id IS NULL OR shipping_address_id = '00000000-0000-0000-0000-000000000000'::UUID)
  LOOP
    BEGIN
      address_data := order_record.shipping_address;
      
      -- Skip if address data is invalid or empty
      IF address_data IS NULL OR address_data = '{}'::JSONB THEN
        RAISE NOTICE 'Skipping order %: Invalid or empty shipping_address', order_record.id;
        CONTINUE;
      END IF;
      
      -- Extract required fields (handle different JSON key formats)
      DECLARE
        full_name_val TEXT;
        email_val TEXT;
        phone_val TEXT;
        street_val TEXT;
        city_val TEXT;
        province_val TEXT;
        zip_val TEXT;
      BEGIN
        -- Try different possible key names
        full_name_val := COALESCE(
          address_data->>'full_name',
          address_data->>'fullName',
          address_data->>'name',
          'Unknown'
        );
        
        email_val := COALESCE(
          address_data->>'email',
          ''
        );
        
        phone_val := COALESCE(
          address_data->>'phone',
          address_data->>'phone_number',
          ''
        );
        
        street_val := COALESCE(
          address_data->>'street_address',
          address_data->>'street',
          address_data->>'line1',
          address_data->>'address_line1',
          ''
        );
        
        city_val := COALESCE(
          address_data->>'city',
          ''
        );
        
        province_val := COALESCE(
          address_data->>'province',
          address_data->>'state',
          ''
        );
        
        zip_val := COALESCE(
          address_data->>'zip_code',
          address_data->>'zip',
          address_data->>'postal',
          address_data->>'postal_code',
          ''
        );
        
        -- Validate required fields
        IF full_name_val = 'Unknown' OR full_name_val = '' OR
           street_val = '' OR city_val = '' OR province_val = '' OR zip_val = '' THEN
          RAISE NOTICE 'Skipping order %: Missing required address fields', order_record.id;
          error_count := error_count + 1;
          CONTINUE;
        END IF;
        
        -- Check if an identical address already exists for this user
        SELECT id INTO existing_address_id
        FROM public.addresses
        WHERE user_id = order_record.user_id
          AND full_name = full_name_val
          AND street_address = street_val
          AND city = city_val
          AND province = province_val
          AND zip_code = zip_val
        LIMIT 1;
        
        -- If address exists, reuse it; otherwise create new
        IF existing_address_id IS NOT NULL THEN
          address_id := existing_address_id;
        ELSE
          -- Insert new address
          INSERT INTO public.addresses (
            user_id,
            full_name,
            email,
            phone,
            street_address,
            city,
            province,
            zip_code,
            address_type,
            is_default
          ) VALUES (
            order_record.user_id,
            full_name_val,
            email_val,
            phone_val,
            street_val,
            city_val,
            province_val,
            zip_val,
            'shipping',
            FALSE  -- Don't set as default during migration
          )
          RETURNING id INTO address_id;
        END IF;
        
        -- Update order with shipping_address_id
        UPDATE public.orders
        SET shipping_address_id = address_id
        WHERE id = order_record.id;
        
        migrated_count := migrated_count + 1;
        
        -- Log progress every 100 records
        IF migrated_count % 100 = 0 THEN
          RAISE NOTICE 'Migrated % orders so far...', migrated_count;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error migrating order %: %', order_record.id, SQLERRM;
        error_count := error_count + 1;
      END;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing order %: %', order_record.id, SQLERRM;
      error_count := error_count + 1;
    END;
  END LOOP;
  
  -- Report results
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Successfully migrated: % orders', migrated_count;
  RAISE NOTICE 'Errors encountered: % orders', error_count;
  
  -- Validation: Check for any remaining orders with NULL shipping_address_id
  DECLARE
    remaining_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM public.orders
    WHERE shipping_address IS NOT NULL
      AND shipping_address_id IS NULL;
    
    IF remaining_count > 0 THEN
      RAISE WARNING 'Warning: % orders still have NULL shipping_address_id', remaining_count;
    ELSE
      RAISE NOTICE 'Validation passed: All orders with shipping_address now have shipping_address_id';
    END IF;
  END;
END $$;

-- After successful migration, you can optionally:
-- 1. Make shipping_address_id NOT NULL (uncomment below)
-- 2. Remove shipping_address column (NOT recommended - keep for historical reference)

-- Uncomment to make shipping_address_id required for new orders:
-- ALTER TABLE public.orders
-- ALTER COLUMN shipping_address_id SET NOT NULL;

-- DO NOT remove shipping_address column - it contains historical data
-- You can archive it later if needed, but keep it for now












