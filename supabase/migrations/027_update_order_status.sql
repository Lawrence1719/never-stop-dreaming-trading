-- 027_update_order_status.sql
-- Update orders status check to include 'delivered'

-- Drop the existing constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with 'delivered' status
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled','duplicate','delivered'));

-- Update existing 'completed' orders to 'delivered' if needed, or just allow both
-- Many stores use 'completed' as synonym for 'delivered'. 
-- But the request specifically asks for 'delivered'.
-- For now, let's just make sure both are accepted.
