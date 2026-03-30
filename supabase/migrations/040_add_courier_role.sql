-- 040_add_courier_role.sql
-- Add 'courier' role and delivery tracking system

-- A. Update profiles.role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
CHECK (role = ANY (ARRAY['admin'::text, 'customer'::text, 'courier'::text]));

-- B. Create courier_deliveries table
CREATE TABLE IF NOT EXISTS public.courier_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_image_url text,
  delivery_notes text,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status = ANY (ARRAY['assigned', 'in_transit', 'delivered', 'failed'])),
  assigned_at timestamp with time zone DEFAULT now(),
  delivered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courier_deliveries_pkey PRIMARY KEY (id)
);

-- C. Add courier_id to orders
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'courier_id') THEN
    ALTER TABLE public.orders ADD COLUMN courier_id uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- D. Update notifications.target_role constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_target_role_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_target_role_check
CHECK (target_role = ANY (ARRAY['customer'::text, 'admin'::text, 'courier'::text]));

-- E. RLS Policies for courier_deliveries
ALTER TABLE public.courier_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couriers view own deliveries" ON public.courier_deliveries;
CREATE POLICY "Couriers view own deliveries" ON public.courier_deliveries
FOR SELECT USING (courier_id = auth.uid());

DROP POLICY IF EXISTS "Couriers update own deliveries" ON public.courier_deliveries;
CREATE POLICY "Couriers update own deliveries" ON public.courier_deliveries
FOR UPDATE USING (courier_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access on courier_deliveries" ON public.courier_deliveries;
CREATE POLICY "Admins full access on courier_deliveries" ON public.courier_deliveries
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- F. Create delivery-proofs storage bucket
-- Note: This might require double-checking if the 'storage' schema exists or if 'buckets' table exists.
-- In standard Supabase, this works.
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Couriers can upload their own proofs
DROP POLICY IF EXISTS "Couriers can upload proof" ON storage.objects;
CREATE POLICY "Couriers can upload proof" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'delivery-proofs' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'courier')
);

-- Storage RLS: Admins can view all proofs
DROP POLICY IF EXISTS "Admins can view proofs" ON storage.objects;
CREATE POLICY "Admins can view proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'delivery-proofs' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Storage RLS: Couriers can view their own proofs
DROP POLICY IF EXISTS "Couriers can view own proofs" ON storage.objects;
CREATE POLICY "Couriers can view own proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'delivery-proofs' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'courier')
);
