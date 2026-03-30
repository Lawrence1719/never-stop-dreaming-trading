-- 043_customer_proof_read_access.sql
-- Allow customers to view proof of delivery for their own orders

-- Customers can read courier_deliveries for orders that belong to them
DROP POLICY IF EXISTS "Customers view proof for own orders" ON public.courier_deliveries;
CREATE POLICY "Customers view proof for own orders" ON public.courier_deliveries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE public.orders.id = public.courier_deliveries.order_id
    AND public.orders.user_id = auth.uid()
  )
);

-- Make the delivery-proofs bucket public so image URLs are accessible
UPDATE storage.buckets 
SET public = true 
WHERE id = 'delivery-proofs';

-- Allow anyone to read from the public delivery-proofs bucket
DROP POLICY IF EXISTS "Public can view delivery proofs" ON storage.objects;
CREATE POLICY "Public can view delivery proofs" ON storage.objects
FOR SELECT USING (bucket_id = 'delivery-proofs');
