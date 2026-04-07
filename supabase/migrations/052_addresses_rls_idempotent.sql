-- 052_addresses_rls_idempotent.sql
-- Idempotently verify and re-assert RLS policies on the addresses table.
-- This is a no-op if the table is already correctly configured.
-- Safe to run multiple times.

-- Ensure RLS is enabled (idempotent).
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Re-create all four ownership policies for customers (drop-if-exists then create).

DROP POLICY IF EXISTS "Addresses: users can view own addresses"    ON public.addresses;
DROP POLICY IF EXISTS "Addresses: users can insert own addresses"  ON public.addresses;
DROP POLICY IF EXISTS "Addresses: users can update own addresses"  ON public.addresses;
DROP POLICY IF EXISTS "Addresses: users can delete own addresses"  ON public.addresses;

-- SELECT: only the owning user.
CREATE POLICY "Addresses: users can view own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user may only insert rows where user_id = their own UID.
CREATE POLICY "Addresses: users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user may only update their own rows.
CREATE POLICY "Addresses: users can update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: user may only delete their own rows.
CREATE POLICY "Addresses: users can delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Courier read-only policy (retained from migration 041).
-- Couriers may read the delivery address for orders assigned to them.
DROP POLICY IF EXISTS "Couriers view assigned addresses" ON public.addresses;
CREATE POLICY "Couriers view assigned addresses"
  ON public.addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.courier_deliveries cd
      JOIN public.orders o ON o.id = cd.order_id
      WHERE cd.courier_id = auth.uid()
        AND o.shipping_address_id = public.addresses.id
    )
  );

-- NOTE: The service-role key bypasses RLS by design (Supabase default).
-- All server-side API routes that use the service-role client MUST
-- include an explicit user_id filter on every query \u2014 they do as of this audit.
