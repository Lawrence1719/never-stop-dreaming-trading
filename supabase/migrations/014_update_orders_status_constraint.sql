-- 014_update_orders_status_constraint.sql
-- Update status constraint to include 'duplicate' status

-- Drop the existing constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with 'duplicate' status
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled','duplicate'));

