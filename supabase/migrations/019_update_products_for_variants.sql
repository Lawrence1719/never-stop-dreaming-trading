-- Migration: Update products table to support variants
-- Make price, stock, and sku nullable since they're now stored at variant level
-- Default values will be used when inserting via API

ALTER TABLE products
ALTER COLUMN price SET DEFAULT 0,
ALTER COLUMN stock SET DEFAULT 0,
ALTER COLUMN sku SET DEFAULT '';

-- This allows the products table to accept inserts without these fields
-- The actual values will come from product_variants
