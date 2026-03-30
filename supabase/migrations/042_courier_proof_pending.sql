-- Add 'admin_overridden' columns to track administrative bypasses
ALTER TABLE public.courier_deliveries 
ADD COLUMN admin_overridden boolean DEFAULT false;

ALTER TABLE public.courier_deliveries 
ADD COLUMN admin_overridden_at timestamp with time zone;

-- Add 'proof_pending' to the status array
ALTER TABLE public.courier_deliveries 
DROP CONSTRAINT IF EXISTS courier_deliveries_status_check;

ALTER TABLE public.courier_deliveries 
ADD CONSTRAINT courier_deliveries_status_check
CHECK (status = ANY (ARRAY[
  'assigned', 
  'in_transit', 
  'delivered', 
  'failed',
  'proof_pending'
]));
