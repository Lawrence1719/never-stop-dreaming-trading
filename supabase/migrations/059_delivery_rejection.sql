-- Add rejection fields to courier_deliveries
ALTER TABLE public.courier_deliveries 
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rejection_notes text,
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone;

-- Add check constraint for valid rejection reasons
ALTER TABLE public.courier_deliveries
ADD CONSTRAINT valid_rejection_reason 
CHECK (
  rejection_reason IS NULL OR 
  rejection_reason = ANY (ARRAY[
    'damaged_packaging',
    'wrong_product', 
    'expired_product',
    'other'
  ])
);

-- RPC for atomic stock increment
CREATE OR REPLACE FUNCTION increment_stock(row_id uuid, amount integer)
RETURNS void AS $$
BEGIN
  UPDATE public.product_variants
  SET stock = stock + amount
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

