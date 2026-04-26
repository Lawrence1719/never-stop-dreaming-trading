-- Migration: Add unit and doz_pckg to product_variants
-- Timestamp: 2026-04-26
-- Purpose: Support variant-specific metadata for NSD distributor requirements.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS item_code text,
  ADD COLUMN IF NOT EXISTS unit      text,
  ADD COLUMN IF NOT EXISTS doz_pckg  text;

-- Update existing records if possible (optional, but good for data integrity)
-- For now, we leave them as NULL or handle via app logic.
