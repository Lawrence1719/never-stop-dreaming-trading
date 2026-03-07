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
