-- 041_courier_access_policies.sql
-- Allow couriers to view orders and addresses assigned to them

-- A. Update public.orders RLS
DROP POLICY IF EXISTS "Couriers view assigned orders" ON public.orders;
CREATE POLICY "Couriers view assigned orders" ON public.orders
FOR SELECT USING (
  courier_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- B. Update public.addresses RLS
DROP POLICY IF EXISTS "Couriers view assigned addresses" ON public.addresses;
CREATE POLICY "Couriers view assigned addresses" ON public.addresses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE public.orders.courier_id = auth.uid() 
    AND (
      public.orders.shipping_address_id = public.addresses.id 
      OR public.orders.billing_address_id = public.addresses.id
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- C. Update public.order_items RLS
DROP POLICY IF EXISTS "Couriers view assigned order items" ON public.order_items;
CREATE POLICY "Couriers view assigned order items" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE public.orders.id = public.order_items.order_id 
    AND public.orders.courier_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
