-- 039_add_slug_to_products.sql
-- Add slug, specifications, and iot columns to products table

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS iot BOOLEAN DEFAULT false;

-- Populate slug with ID for existing products if slug is null
UPDATE public.products
SET slug = id::text
WHERE slug IS NULL;
