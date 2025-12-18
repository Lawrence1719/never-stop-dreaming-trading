-- Migration: Remove SKU unique constraint from products table
-- SKU is now at the variant level, not the product level
-- This removes the idx_products_sku unique constraint

DROP INDEX IF EXISTS idx_products_sku;

-- Verify the index is removed
-- The products table will keep the sku column for backward compatibility
-- but it won't have a unique constraint anymore
