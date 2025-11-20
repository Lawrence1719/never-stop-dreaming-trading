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
