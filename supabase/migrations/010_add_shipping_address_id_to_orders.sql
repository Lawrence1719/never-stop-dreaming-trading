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

