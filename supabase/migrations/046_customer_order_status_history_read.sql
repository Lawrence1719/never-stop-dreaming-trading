-- Allow customers to read order_status_history for orders they own (customer order detail timeline)

DROP POLICY IF EXISTS "Customers view status history for own orders" ON public.order_status_history;
CREATE POLICY "Customers view status history for own orders"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND orders.user_id = auth.uid()
    )
  );
