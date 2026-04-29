-- Migration: Restrict product_variants RLS to admins
-- Priority 3 — SECURITY

-- 1. Drop the existing permissive policies (from migration 018)
DROP POLICY IF EXISTS "Authenticated users can insert product variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can update product variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can delete product variants" ON product_variants;

-- 2. Create Admin-only write policies using existing is_admin() helper
CREATE POLICY "Admin can insert variants"
ON product_variants FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update variants"
ON product_variants FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete variants"
ON product_variants FOR DELETE
TO authenticated
USING (public.is_admin());
