-- 030_add_orders_rls_policies.sql
-- Add Row Level Security policies for orders table

-- Enable RLS on orders (idempotent)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 1. Users can view their own orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view their own orders'
  ) THEN
    CREATE POLICY "Users can view their own orders"
      ON public.orders FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- 2. Users can insert their own orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert their own orders'
  ) THEN
    CREATE POLICY "Users can insert their own orders"
      ON public.orders FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- 3. Users can update their own orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update their own orders'
  ) THEN
    CREATE POLICY "Users can update their own orders"
      ON public.orders FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- 4. Admins can view all orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can view all orders'
  ) THEN
    CREATE POLICY "Admins can view all orders"
      ON public.orders FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- 5. Admins can update all orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can update all orders'
  ) THEN
    CREATE POLICY "Admins can update all orders"
      ON public.orders FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- 6. Admins can delete all orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can delete all orders'
  ) THEN
    CREATE POLICY "Admins can delete all orders"
      ON public.orders FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- 7. Service role full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Service role full access on orders'
  ) THEN
    CREATE POLICY "Service role full access on orders"
      ON public.orders FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
