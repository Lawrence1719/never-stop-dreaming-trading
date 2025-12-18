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
