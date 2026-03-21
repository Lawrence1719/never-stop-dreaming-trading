-- Ensure pgcrypto is available (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  sku TEXT UNIQUE NOT NULL,
  stock INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (products are public for reading)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index recommendations
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_reorder_threshold ON public.products(reorder_threshold);


-- 2. Create cart table
CREATE TABLE IF NOT EXISTS public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text, 
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart: owner can access"
  ON public.cart FOR ALL
  USING (auth.uid() = user_id);


-- 3. Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wishlist_user_product_idx ON public.wishlist(user_id, product_id);

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist: owner can access"
  ON public.wishlist FOR ALL
  USING (auth.uid() = user_id);




-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'stock', 'system')),
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for faster queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);


-- 003_create_orders_table.sql
-- Simple orders table for capstone project

-- Create table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled','duplicate')),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_address JSONB,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- Helper function to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at on update
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.orders;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_column();

-- Simple example: insert an order
-- INSERT INTO public.orders (user_id, status, total, items, shipping_address, payment_method)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'pending', 29.99, '[{"product_id":"p-001","name":"Milk","quantity":1,"price":2.99}]'::jsonb, '{"line1":"123 Main St","city":"Town"}'::jsonb, 'card');

-- Create settings table for storing application settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on updated_at
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on settings update
DROP TRIGGER IF EXISTS trigger_update_settings_updated_at ON settings;
CREATE TRIGGER trigger_update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can read/write settings
CREATE POLICY "Admins can manage settings"
  ON settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- 009_create_addresses_table.sql
-- Create addresses table for normalized address storage

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  address_type TEXT DEFAULT 'shipping',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON public.addresses (user_id, is_default) WHERE is_default = TRUE;

-- Helper function to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at on update
DROP TRIGGER IF EXISTS trg_set_updated_at_addresses ON public.addresses;
CREATE TRIGGER trg_set_updated_at_addresses
BEFORE UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_column();

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own addresses
CREATE POLICY "Addresses: users can view own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Addresses: users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Addresses: users can update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Addresses: users can delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If this address is being set as default, unset all other defaults for this user
  IF NEW.is_default = TRUE THEN
    UPDATE public.addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default address
DROP TRIGGER IF EXISTS trg_ensure_single_default_address ON public.addresses;
CREATE TRIGGER trg_ensure_single_default_address
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_address();


-- 010_add_shipping_address_id_to_orders.sql
-- Add shipping_address_id column to orders table and establish foreign key relationship

-- Add shipping_address_id column (nullable initially for migration)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES public.addresses(id) ON DELETE RESTRICT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_id ON public.orders (shipping_address_id);

-- Optional: Add billing_address_id for future use
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS billing_address_id UUID REFERENCES public.addresses(id) ON DELETE RESTRICT;

-- Create index for billing address
CREATE INDEX IF NOT EXISTS idx_orders_billing_address_id ON public.orders (billing_address_id);

-- Note: We will make shipping_address_id NOT NULL after data migration
-- This is done in the data migration script (011_migrate_shipping_addresses.sql)













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













-- 012_add_idempotency_key_to_orders.sql
-- Add idempotency_key column to prevent duplicate orders

-- Add idempotency_key column (nullable for existing orders, unique for new ones)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON public.orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.idempotency_key IS 
'Unique key generated by client to prevent duplicate orders from retries or double-clicks. If an order with this key already exists, return that order instead of creating a new one.';













-- 013_add_duplicate_detection_trigger.sql
-- Database-level trigger to catch duplicate orders
-- This provides an additional layer of protection beyond frontend/backend checks

-- Create function to detect and handle duplicates
CREATE OR REPLACE FUNCTION public.detect_duplicate_order()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  existing_order_id UUID;
BEGIN
  -- Check if there's another order from the same user with same total within last 5 seconds
  -- Get the first (earliest) existing order ID
  SELECT id INTO existing_order_id
  FROM public.orders
  WHERE user_id = NEW.user_id
    AND total = NEW.total
    AND payment_method = NEW.payment_method
    AND id != NEW.id  -- Exclude current order
    AND created_at >= NOW() - INTERVAL '5 seconds'
    AND status NOT IN ('cancelled', 'duplicate')
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If duplicate found, mark this order as duplicate
  IF existing_order_id IS NOT NULL THEN
    -- Count total duplicates for logging
    SELECT COUNT(*) INTO duplicate_count
    FROM public.orders
    WHERE user_id = NEW.user_id
      AND total = NEW.total
      AND payment_method = NEW.payment_method
      AND id != NEW.id
      AND created_at >= NOW() - INTERVAL '5 seconds'
      AND status NOT IN ('cancelled', 'duplicate');
    
    -- Log the duplicate attempt (you can create a duplicates_log table if needed)
    RAISE WARNING 'Duplicate order detected: user_id=%, total=%, existing_order_id=%, new_order_id=%, count=%', 
      NEW.user_id, NEW.total, existing_order_id, NEW.id, duplicate_count;
    
    -- Mark as duplicate instead of allowing normal insert
    NEW.status := 'duplicate';
    
    -- Optionally: You could prevent the insert entirely by raising an exception
    -- RAISE EXCEPTION 'Duplicate order detected. Order % already exists.', existing_order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before insert
DROP TRIGGER IF EXISTS trg_detect_duplicate_order ON public.orders;
CREATE TRIGGER trg_detect_duplicate_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.detect_duplicate_order();

-- Note: This trigger will mark duplicates, but idempotency_key check should prevent most cases
-- This is a safety net for edge cases


-- 014_update_orders_status_constraint.sql
-- Update status constraint to include 'duplicate' status

-- Drop the existing constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with 'duplicate' status
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled','duplicate'));













-- 015_add_order_status_columns.sql
-- Add columns for order status tracking and timestamps

-- Add timestamp columns for status tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Add tracking information columns
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS courier TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON public.orders(shipped_at) WHERE shipped_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number) WHERE tracking_number IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when order payment was confirmed';
COMMENT ON COLUMN public.orders.shipped_at IS 'Timestamp when order was shipped';
COMMENT ON COLUMN public.orders.delivered_at IS 'Timestamp when order was delivered';
COMMENT ON COLUMN public.orders.tracking_number IS 'Courier tracking number for shipped orders';
COMMENT ON COLUMN public.orders.courier IS 'Shipping courier/provider name (2GO, LBC, Lalamove, etc)';













-- 016_create_order_status_history_table.sql
-- Create order status history table for audit trail

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  tracking_number TEXT,
  courier TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON public.order_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_new_status ON public.order_status_history(new_status);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all status history
CREATE POLICY "Admins can view order status history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Admins can insert status history
CREATE POLICY "Admins can insert order status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.order_status_history IS 'Audit trail of all order status changes';
COMMENT ON COLUMN public.order_status_history.old_status IS 'Previous order status (NULL for initial status)';
COMMENT ON COLUMN public.order_status_history.new_status IS 'New order status';
COMMENT ON COLUMN public.order_status_history.changed_by IS 'Admin user who made the status change';
COMMENT ON COLUMN public.order_status_history.notes IS 'Optional notes about the status change';


-- Add customer confirmation columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by_customer_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_confirmed boolean DEFAULT false;

-- Ensure payment_status column exists (in case it was missed in earlier migrations)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add completed status to allowed statuses
DO $$ 
BEGIN
  -- Check if constraint exists before dropping
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_status_check' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Add new constraint with 'completed' status
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'duplicate'));

-- Create index for auto-confirmation queries
CREATE INDEX IF NOT EXISTS idx_orders_delivered_unconfirmed 
  ON orders (delivered_at) 
  WHERE status = 'delivered' AND confirmed_by_customer_at IS NULL;

-- Add comment
COMMENT ON COLUMN orders.confirmed_by_customer_at IS 'Timestamp when customer confirmed receipt of order';
COMMENT ON COLUMN orders.auto_confirmed IS 'True if order was auto-confirmed after 7 days instead of manual customer confirmation';

-- Migration: Create product_variants table for relational product variants
-- Timestamp: 2025-12-19
-- Purpose: Store variants (size, weight, format, etc.) as separate rows linked to products.
-- This ensures proper inventory tracking, scalability, and IoT-friendly updates.

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,                    -- e.g. "1kg", "5kg", "150g", "1L", "6-pack"
  price NUMERIC(10, 2) NOT NULL,                  -- Price for this specific variant
  stock INTEGER NOT NULL DEFAULT 0,               -- Stock level for this variant
  sku TEXT NOT NULL UNIQUE,                       -- Unique SKU per variant (not at product level)
  reorder_threshold INTEGER DEFAULT 5,            -- Low stock alert threshold
  is_active BOOLEAN DEFAULT true,                 -- Soft delete / archive flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);

-- Trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION set_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_product_variants_updated_at_trigger ON product_variants;
CREATE TRIGGER set_product_variants_updated_at_trigger
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION set_product_variants_updated_at();

-- Enable RLS on product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_variants
-- Anyone (public) can view active variants
CREATE POLICY "Anyone can view active product variants"
  ON product_variants FOR SELECT
  TO PUBLIC
  USING (is_active = true);

-- Authenticated users can view all variants (including inactive)
CREATE POLICY "Authenticated users can view all product variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert variants (via app logic checking role)
CREATE POLICY "Authenticated users can insert product variants"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can update variants
CREATE POLICY "Authenticated users can update product variants"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete variants
CREATE POLICY "Authenticated users can delete product variants"
  ON product_variants FOR DELETE
  TO authenticated
  USING (true);

-- MIGRATION NOTES:
--
-- 1. Products table migration (020251120090000) added SKU, stock, price, reorder_threshold to products.
--    These should NOW be REMOVED from products table (will do in separate cleanup migration).
--    For now, variants table is independent.
--
-- 2. Data Migration Strategy (for existing products with price/stock/sku):
--    - Create a function to backfill product_variants from existing products.
--    - Each existing product becomes ONE variant with label from its original context.
--    - This is optional but recommended for data integrity.
--
-- 3. Future cleanup: Remove SKU, price, stock, reorder_threshold from products table
--    after backfill is complete and frontend updated.
--
-- 4. IoT Integration: product_variants.id is the KEY for inventory updates, not products.id.
--    Sensors/IoT systems should update product_variants(id).stock, not products.stock.

-- Migration: Update products table to support variants
-- Make price, stock, and sku nullable since they're now stored at variant level
-- Default values will be used when inserting via API

ALTER TABLE products
ALTER COLUMN price SET DEFAULT 0,
ALTER COLUMN stock SET DEFAULT 0,
ALTER COLUMN sku SET DEFAULT '';

-- This allows the products table to accept inserts without these fields
-- The actual values will come from product_variants

-- Migration: Remove SKU unique constraint from products table
-- SKU is now at the variant level, not the product level
-- This removes the idx_products_sku unique constraint

DROP INDEX IF EXISTS idx_products_sku;

-- Verify the index is removed
-- The products table will keep the sku column for backward compatibility
-- but it won't have a unique constraint anymore

-- Migration: Add process_checkout RPC for atomic order creation and stock deduction
-- Timestamp: 2026-03-03
-- Purpose: Fix checkout race conditions by deducting stock and creating orders within a single transaction.

CREATE OR REPLACE FUNCTION process_checkout(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_total NUMERIC;
  v_items JSONB;
  v_shipping_address_id UUID;
  v_shipping_method TEXT;
  v_shipping_cost NUMERIC;
  v_payment_method TEXT;
  v_idempotency_key TEXT;
  
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  
  v_order_id UUID;
  v_created_order JSONB;
BEGIN
  -- Extract common fields from payload
  v_user_id := (payload->>'user_id')::UUID;
  v_status := payload->>'status';
  v_total := (payload->>'total')::NUMERIC;
  v_items := payload->'items';
  v_shipping_address_id := (payload->>'shipping_address_id')::UUID;
  v_shipping_method := payload->>'shipping_method';
  v_shipping_cost := (payload->>'shipping_cost')::NUMERIC;
  v_payment_method := payload->>'payment_method';
  v_idempotency_key := payload->>'idempotency_key';

  -- 1. Idempotency Check
  IF v_idempotency_key IS NOT NULL THEN
    SELECT row_to_json(o) INTO v_created_order
    FROM public.orders o
    WHERE o.idempotency_key = v_idempotency_key;
    
    IF v_created_order IS NOT NULL THEN
      RETURN jsonb_build_object(
        'data', v_created_order,
        'duplicate', true,
        'message', 'Order already exists with this idempotency key'
      );
    END IF;
  END IF;

  -- 2. Validate Stock using Row-level Locks (FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Item "%" is missing variant_id', v_item->>'name';
    END IF;

    SELECT stock INTO v_current_stock
    FROM public.product_variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Variant % not found', v_variant_id;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Out of stock: Only % left for item "%"', v_current_stock, v_item->>'name';
    END IF;
  END LOOP;

  -- 3. Deduct Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    UPDATE public.product_variants
    SET stock = stock - v_quantity,
        updated_at = NOW()
    WHERE id = v_variant_id;
  END LOOP;

  -- 4. Create Order
  INSERT INTO public.orders (
    user_id,
    status,
    total,
    items,
    shipping_address_id,
    payment_method,
    idempotency_key
  ) VALUES (
    v_user_id,
    v_status,
    v_total,
    v_items,
    v_shipping_address_id,
    v_payment_method,
    v_idempotency_key
  ) RETURNING id INTO v_order_id;

  -- 5. Insert into order_items table
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC
    );
  END LOOP;

  -- 6. Insert into order_status_history
  INSERT INTO public.order_status_history (
    order_id,
    new_status,
    changed_by,
    notes
  ) VALUES (
    v_order_id,
    v_status,
    v_user_id,
    'Order created via checkout'
  );

  SELECT row_to_json(o) INTO v_created_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN jsonb_build_object(
    'data', v_created_order,
    'duplicate', false,
    'message', 'Order created successfully'
  );
END;
$$;

-- Migration: Add Reporting RPCs to prevent Node.js memory exhaustion
-- Timestamp: 2026-03-03
-- Purpose: Offload heavy array reductions to Postgres for dashboard analytics

-- 1. Get Top Products RPC
CREATE OR REPLACE FUNCTION get_top_products_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  name TEXT,
  sold BIGINT,
  revenue NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.name, 'Unknown Product') as name,
    SUM(oi.quantity)::BIGINT as sold,
    SUM(oi.quantity * oi.price)::NUMERIC as revenue
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY p.name
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$$;

-- 2. Get Sales By Category RPC
CREATE OR REPLACE FUNCTION get_sales_by_category_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
  category TEXT,
  sales BIGINT,
  revenue NUMERIC,
  percent NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_grand_total NUMERIC;
BEGIN
  -- get total revenue first to calculate percent
  SELECT COALESCE(SUM(oi.quantity * oi.price), 0) INTO v_grand_total
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date;

  RETURN QUERY
  SELECT 
    COALESCE(p.category, 'Uncategorized') as category,
    SUM(oi.quantity)::BIGINT as sales,
    SUM(oi.quantity * oi.price)::NUMERIC as revenue,
    CASE 
      WHEN v_grand_total > 0 THEN ROUND((SUM(oi.quantity * oi.price) / v_grand_total) * 100, 2)
      ELSE 0
    END as percent
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY p.category
  ORDER BY revenue DESC;
END;
$$;

-- 3. Get Sales Overview (Daily/Weekly) Fast Aggregation
CREATE OR REPLACE FUNCTION get_sales_overview_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_trunc_interval TEXT)
RETURNS TABLE (
  period TEXT,
  orders BIGINT,
  revenue NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC(p_trunc_interval, o.created_at), 
      CASE 
        WHEN p_trunc_interval = 'hour' THEN 'YYYY-MM-DD HH24:00'
        ELSE 'YYYY-MM-DD'
      END
    ) as period,
    COUNT(*)::BIGINT as orders,
    COALESCE(SUM(o.total), 0)::NUMERIC as revenue
  FROM public.orders o
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- 023_integration_orders_schema.sql
-- Add integration-specific columns to orders and create order_items table
-- Purpose: Full BeatRoute / ERP integration support

-- ============================================================
-- 1. Add integration columns to orders table
-- ============================================================

-- External invoice reference (erp_invoice_number from BeatRoute)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- BeatRoute retailer ID
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS retailer_br_id BIGINT;

-- Invoice date from BeatRoute
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Total tax amount
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS total_tax NUMERIC(10,2) DEFAULT 0;

-- Remarks / notes
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Payment due date
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- Invoice-level discount
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_level_discount NUMERIC(10,2) DEFAULT 0;

-- Order source: 'web' (default for existing), 'beatroute' for integration orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

-- Custom fields from BeatRoute (array of {id, value} objects)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS custom_fields JSONB;

-- Index on external_reference for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_external_reference
  ON public.orders(external_reference)
  WHERE external_reference IS NOT NULL;

-- Index on source for filtering
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);

-- ============================================================
-- 2. Update existing order_items table for integration support
-- ============================================================

-- Make product_id nullable (integration orders may not match a product)
ALTER TABLE public.order_items
ALTER COLUMN product_id DROP NOT NULL;

-- Add variant reference
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Add SKU from external system
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS sku_external_id TEXT;

-- Add discount per item
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;

-- Add unit of measure (PC, EA, CS, BC, etc.)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS sku_uom TEXT;

-- Add gross value
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS gross_value NUMERIC(10,2) DEFAULT 0;

-- Add tax code
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS tax_code TEXT;

-- Add tax amount
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON public.order_items(sku_external_id) WHERE sku_external_id IS NOT NULL;

-- RLS policies (skip if already exist)
DO $$
BEGIN
  -- Service role full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Service role full access on order_items'
  ) THEN
    CREATE POLICY "Service role full access on order_items"
      ON public.order_items FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  -- Users can view their own order items
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view their own order items'
  ) THEN
    CREATE POLICY "Users can view their own order items"
      ON public.order_items FOR SELECT TO authenticated
      USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN public.orders.external_reference IS 'ERP invoice number from BeatRoute (erp_invoice_number)';
COMMENT ON COLUMN public.orders.retailer_br_id IS 'BeatRoute retailer ID';
COMMENT ON COLUMN public.orders.invoice_date IS 'Invoice date from BeatRoute';
COMMENT ON COLUMN public.orders.source IS 'Order source: web, beatroute';
COMMENT ON COLUMN public.order_items.variant_id IS 'Product variant reference for SKU matching';
COMMENT ON COLUMN public.order_items.sku_external_id IS 'Original SKU code from BeatRoute/ERP';

-- Migration: Fix cart table and process_checkout RPC
-- Timestamp: 2026-03-03
-- Purpose: Add variant_id to cart table and ensure process_checkout handles variants correctly.

-- 1. Update cart table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart' AND column_name='variant_id') THEN
    ALTER TABLE public.cart ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update unique constraint for cart to include variant
-- First drop existing constraint if it exists (might be named differently)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cart_user_id_product_id_key') THEN
        ALTER TABLE public.cart DROP CONSTRAINT cart_user_id_product_id_key;
    END IF;
END $$;

-- Add new unique constraint
ALTER TABLE public.cart DROP CONSTRAINT IF EXISTS cart_pkey; -- Safety
ALTER TABLE public.cart ADD PRIMARY KEY (id); -- Ensure ID is PK
ALTER TABLE public.cart ADD CONSTRAINT cart_user_product_variant_unique UNIQUE (user_id, product_id, variant_id);

-- 2. Fix process_checkout function
CREATE OR REPLACE FUNCTION public.process_checkout(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_total NUMERIC;
  v_items JSONB;
  v_shipping_address_id UUID;
  v_shipping_method TEXT;
  v_shipping_cost NUMERIC;
  v_payment_method TEXT;
  v_idempotency_key TEXT;
  
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  
  v_order_id UUID;
  v_created_order JSONB;
BEGIN
  -- Extract common fields from payload
  v_user_id := (payload->>'user_id')::UUID;
  v_status := payload->>'status';
  v_total := (payload->>'total')::NUMERIC;
  v_items := payload->'items';
  v_shipping_address_id := (payload->>'shipping_address_id')::UUID;
  v_shipping_method := payload->>'shipping_method';
  v_shipping_cost := (payload->>'shipping_cost')::NUMERIC;
  v_payment_method := payload->>'payment_method';
  v_idempotency_key := payload->>'idempotency_key';

  -- 1. Idempotency Check
  IF v_idempotency_key IS NOT NULL THEN
    SELECT row_to_json(o) INTO v_created_order
    FROM public.orders o
    WHERE o.idempotency_key = v_idempotency_key;
    
    IF v_created_order IS NOT NULL THEN
      RETURN jsonb_build_object(
        'data', v_created_order,
        'duplicate', true,
        'message', 'Order already exists with this idempotency key'
      );
    END IF;
  END IF;

  -- 2. Validate Stock using Row-level Locks (FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Item "%" is missing variant_id', v_item->>'name';
    END IF;

    SELECT stock INTO v_current_stock
    FROM public.product_variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Variant % not found', v_variant_id;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Out of stock: Only % left for item "%"', v_current_stock, v_item->>'name';
    END IF;
  END LOOP;

  -- 3. Deduct Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    UPDATE public.product_variants
    SET stock = stock - v_quantity,
        updated_at = NOW()
    WHERE id = v_variant_id;
  END LOOP;

  -- 4. Create Order
  INSERT INTO public.orders (
    user_id,
    status,
    total,
    items,
    shipping_address_id,
    payment_method,
    idempotency_key
  ) VALUES (
    v_user_id,
    v_status,
    v_total,
    v_items,
    v_shipping_address_id,
    v_payment_method,
    v_idempotency_key
  ) RETURNING id INTO v_order_id;

  -- 5. Insert into order_items table
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC
    );
  END LOOP;

  -- 6. Insert into order_status_history
  INSERT INTO public.order_status_history (
    order_id,
    new_status,
    changed_by,
    notes
  ) VALUES (
    v_order_id,
    v_status,
    v_user_id,
    'Order created via checkout'
  );

  SELECT row_to_json(o) INTO v_created_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN jsonb_build_object(
    'data', v_created_order,
    'duplicate', false,
    'message', 'Order created successfully'
  );
END;
$$;

-- 025_add_address_details.sql
-- Add missing columns for full address details and PSGC codes

DO $$ 
BEGIN
    -- Add barangay column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'barangay') THEN
        ALTER TABLE public.addresses ADD COLUMN barangay TEXT;
    END IF;

    -- Add province_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'province_code') THEN
        ALTER TABLE public.addresses ADD COLUMN province_code TEXT;
    END IF;

    -- Add city_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'city_code') THEN
        ALTER TABLE public.addresses ADD COLUMN city_code TEXT;
    END IF;

    -- Add barangay_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'barangay_code') THEN
        ALTER TABLE public.addresses ADD COLUMN barangay_code TEXT;
    END IF;
END $$;

-- Migration: add SKU, reorder_threshold, updated_at, is_active to products
-- Timestamp: 2025-11-20 09:00:00

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add SKU column; populate with UUID by default to guarantee non-null unique values for existing rows
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT gen_random_uuid()::text;

-- Make sku NOT NULL (safe because of the default above)
ALTER TABLE IF EXISTS products
  ALTER COLUMN sku SET NOT NULL;

-- Add unique index on sku
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Add reorder threshold to support re-order alerts
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS reorder_threshold INTEGER DEFAULT 5;

-- Add updated_at timestamp for auditing and sync
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add is_active flag for soft-delete/archive
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Trigger to keep updated_at current on row updates
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_trigger ON products;
CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();



-- 4. Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
