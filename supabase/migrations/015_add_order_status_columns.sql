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

