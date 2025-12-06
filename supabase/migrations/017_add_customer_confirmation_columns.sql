-- Add customer confirmation columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by_customer_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_confirmed boolean DEFAULT false;

-- Ensure payment_status column exists (in case it was missed in earlier migrations)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add completed status to allowed statuses
DO $$ 
BEGIN
  -- Check if constraint exists before dropping
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_status_check' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Add new constraint with 'completed' status
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'duplicate'));

-- Create index for auto-confirmation queries
CREATE INDEX IF NOT EXISTS idx_orders_delivered_unconfirmed 
  ON orders (delivered_at) 
  WHERE status = 'delivered' AND confirmed_by_customer_at IS NULL;

-- Add comment
COMMENT ON COLUMN orders.confirmed_by_customer_at IS 'Timestamp when customer confirmed receipt of order';
COMMENT ON COLUMN orders.auto_confirmed IS 'True if order was auto-confirmed after 7 days instead of manual customer confirmation';
