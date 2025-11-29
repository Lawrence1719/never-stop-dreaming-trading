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

