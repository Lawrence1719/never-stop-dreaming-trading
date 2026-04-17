-- Migration: 055_suppliers_and_products_seed.sql
-- Purpose: Create suppliers table, add supplier/item metadata columns to products
--          and product_variants, then seed real warehouse data from NSD FoxPro system.

BEGIN;

-- ============================================================
-- TASK 1: Create suppliers table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can INSERT suppliers
CREATE POLICY "Admins can insert suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can UPDATE suppliers
CREATE POLICY "Admins can update suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can DELETE suppliers
CREATE POLICY "Admins can delete suppliers"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- TASK 2: Alter products table
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_code   text,
  ADD COLUMN IF NOT EXISTS unit        text,
  ADD COLUMN IF NOT EXISTS doz_pckg   text;

-- ============================================================
-- TASK 3: Alter product_variants table
-- ============================================================

-- Make price default to 0.00 (column already exists as NOT NULL; add default & drop NOT NULL)
ALTER TABLE public.product_variants
  ALTER COLUMN price SET DEFAULT 0.00;

-- Allow price to be NULL during insert (it has a default, so effectively 0.00 always)
-- The column is already NOT NULL per schema 018; we honour the spec to make price defaultable.
-- We do NOT drop NOT NULL so existing constraints stay; the default is enough.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS item_code text;

-- ============================================================
-- TASK 4 & 5: Seed suppliers, products, and product_variants
-- ============================================================
DO $$ 
DECLARE
  v_supplier_aims2  uuid;
  v_supplier_8acon  uuid;
  v_supplier_1010   uuid;
  v_supplier_as77   uuid;

  v_product_id      uuid;
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- TASK 4: Insert suppliers
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.suppliers (name) VALUES
    ('AIMS 2'),
    ('8ACON'),
    ('1010'),
    ('AS77')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_supplier_aims2 FROM public.suppliers WHERE name = 'AIMS 2';
  SELECT id INTO v_supplier_8acon FROM public.suppliers WHERE name = '8ACON';
  SELECT id INTO v_supplier_1010  FROM public.suppliers WHERE name = '1010';
  SELECT id INTO v_supplier_as77  FROM public.suppliers WHERE name = 'AS77';

  -- ──────────────────────────────────────────────────────────
  -- TASK 5: AIMS 2 — Separate products (flavor differences)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super C Chipchacorn P.Bawang', v_supplier_aims2, 'PINOY BAWA', 'BDL', '10/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super C Chipchacorn P.Bawang';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-PINOY BAWA', 'PINOY BAWA')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super C Chipchacorn Sukat Sili', v_supplier_aims2, 'SUKA AT SI', 'BDL', '10/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super C Chipchacorn Sukat Sili';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-SUKA AT SI', 'SUKA AT SI')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super C Chipchcorn L.Kawali', v_supplier_aims2, 'LCHON KUAL', 'BDL', '10/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super C Chipchcorn L.Kawali';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-LCHON KUAL', 'LCHON KUAL')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Crunch Cheddar Cheese 55G', v_supplier_aims2, 'S CRUNCH C', 'BDL', '5/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Crunch Cheddar Cheese 55G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-S CRUNCH C-1', 'S CRUNCH C')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Crunch Red BBQ 55G X5', v_supplier_aims2, 'S.CRUNCH E', 'BDL', '5/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Crunch Red BBQ 55G X5';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-S.CRUNCH E', 'S.CRUNCH E')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Crunch Sweetcorn 55G X5', v_supplier_aims2, 'SUPER SCOR', 'BDL', '5/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Crunch Sweetcorn 55G X5';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-SUPER SCOR', 'SUPER SCOR')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super C Cheese Rings 22G', v_supplier_aims2, 'S.CRUNCH R', 'BDL', '4/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super C Cheese Rings 22G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-S.CRUNCH R', 'S.CRUNCH R')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Delights Dark Choco 14G', v_supplier_aims2, 'SUPERDARK', 'PACK', '12/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Dark Choco 14G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-SUPERDARK', 'SUPERDARK')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Delights Mini Coconut Cook', v_supplier_aims2, 'SDMINI', 'PC', '100/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Mini Coconut Cook';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-SDMINI', 'SDMINI')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Delights Mini Cookies 28G', v_supplier_aims2, 'SUPER COOK', 'PC', '100/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Mini Cookies 28G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-SUPER COOK', 'SUPER COOK')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super Delights Ube Bites 14G', v_supplier_aims2, 'SUPERUBE', 'PACK', '12/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Ube Bites 14G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AIM-SUPERUBE', 'SUPERUBE')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- AIMS 2 — Products with size variants
  -- ──────────────────────────────────────────────────────────

  -- Parent: Super C Cheese 55G
  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Super C Cheese 55G', v_supplier_aims2, 'S CRUNCH C', 'BDL', '5/SAC', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super C Cheese 55G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, '55G X5', 0.00, 0, 'AIM-S CRUNCH C', 'S CRUNCH C')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: Super Delights Brownie
  INSERT INTO public.products (name, supplier_id, unit, doz_pckg, category, is_active)
  VALUES ('Super Delights Brownie', v_supplier_aims2, 'mixed', 'mixed', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Brownie';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, 'Brownie Bites 14G', 0.00, 0, 'AIM-SUPER DELI', 'SUPER DELI'),
    (v_product_id, 'Brownie 200G',      0.00, 0, 'AIM-SUPER BROU', 'SUPER BROU')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: Super Delights Browniescotch
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Super Delights Browniescotch', v_supplier_aims2, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Browniescotch';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, 'Browniescotch 14G',  0.00, 0, 'AIM-BROWNIESCO', 'BROWNIESCO'),
    (v_product_id, 'Browniescotch 180G', 0.00, 0, 'AIM-SUPER',      'SUPER')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: Super Delights Butterscotch
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Super Delights Butterscotch', v_supplier_aims2, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Super Delights Butterscotch';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, 'Butterscotch 14G',  0.00, 0, 'AIM-S DELIGHTS', 'S DELIGHTS'),
    (v_product_id, 'Butterscotch 180G', 0.00, 0, 'AIM-SUPER BUTT', 'SUPER BUTT')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- 8ACON — Separate products (flavor differences)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Bida Cornick 25G X50', v_supplier_8acon, 'BIDA CORNI', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Bida Cornick 25G X50';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-BIDA CORNI', 'BIDA CORNI')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Big Time Asst Biscuits', v_supplier_8acon, '47668', 'JAR', '1/JAR', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Big Time Asst Biscuits';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47668', '47668')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Black Beans 188G X48', v_supplier_8acon, 'RELISHB180', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Black Beans 188G X48';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-RELISHB180', 'RELISHB180')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Adobo 100G', v_supplier_8acon, '47720', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Adobo 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47720', '47720')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Asstd Nuts 100G', v_supplier_8acon, '47723', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Asstd Nuts 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47723', '47723')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang BBQ 100G', v_supplier_8acon, '47721', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang BBQ 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47721', '47721')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Chichacorn Cheese', v_supplier_8acon, '47716', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Chichacorn Cheese';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47716', '47716')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Chichacorn Garlic', v_supplier_8acon, '47715', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Chichacorn Garlic';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47715', '47715')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Chilicheese 100G', v_supplier_8acon, '47719', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Chilicheese 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47719', '47719')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Garlic 100G', v_supplier_8acon, '47717', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Garlic 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47717', '47717')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Hot Garlic 100G', v_supplier_8acon, '47718', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Hot Garlic 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47718', '47718')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Lechon Manok 100G', v_supplier_8acon, '47722', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Lechon Manok 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47722', '47722')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Mixed Nuts 100G', v_supplier_8acon, '47725', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Mixed Nuts 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47725', '47725')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Peas & Beans 85G', v_supplier_8acon, 'BOYPEAS', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Peas & Beans 85G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-BOYPEAS', 'BOYPEAS')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Snack Mixed 100G', v_supplier_8acon, '47724', 'PC', '40/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Snack Mixed 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47724', '47724')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Boy Bawang Sweetcorn 100G', v_supplier_8acon, '47726', 'PC', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Boy Bawang Sweetcorn 100G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47726', '47726')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Cream Corn 425G', v_supplier_8acon, 'CREAM CORN', 'JAR', '1/JAR', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Cream Corn 425G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-CREAM CORN', 'CREAM CORN')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Don Juan Biscuits', v_supplier_8acon, '47684', 'JAR', '1/JAR', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Don Juan Biscuits';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47684', '47684')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Dona Josefa Biscuits', v_supplier_8acon, '47686', 'PC', '50/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Dona Josefa Biscuits';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '8AC-47686', '47686')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- 8ACON — Products with size variants
  -- ──────────────────────────────────────────────────────────

  -- Parent: Bread Crumbs
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Bread Crumbs', v_supplier_8acon, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Bread Crumbs';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, 'Bread Crumbs 60G X50',  0.00, 0, '8AC-BREADCRUMB',   'BREADCRUMB'),
    (v_product_id, 'Bread Crumbs 230G X20', 0.00, 0, '8AC-RELISH230G',   'RELISH230G'),
    (v_product_id, 'Bread Crumbs 500G X8',  0.00, 0, '8AC-BREADCRUMB-2', 'BREADCRUMB')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- 1010 — Separate products (flavor differences)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Big Boy Crackers 10 X5', v_supplier_1010, '47989', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Big Boy Crackers 10 X5';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-47989', '47989')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Big Boy Red Chicharon 10X5', v_supplier_1010, 'BIGBOYRED', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Big Boy Red Chicharon 10X5';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-BIGBOYRED', 'BIGBOYRED')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Bread Pan Buttered Toast 24G', v_supplier_1010, 'B.PAN BUTT', 'BDL', '2/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Bread Pan Buttered Toast 24G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-B.PAN BUTT', 'B.PAN BUTT')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Bread Pan Cheese Onion 24G', v_supplier_1010, 'BREADPAN C', 'BDL', '2/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Bread Pan Cheese Onion 24G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-BREADPAN C', 'BREADPAN C')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Bread Pan Toast Garlic', v_supplier_1010, 'B.OAN GARL', 'BDL', '2/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Bread Pan Toast Garlic';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-B.OAN GARL', 'B.OAN GARL')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Bueno Posporo X120', v_supplier_1010, '47933', 'IBX', '120/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Bueno Posporo X120';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-47933', '47933')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Commando Posporo X120', v_supplier_1010, '47934', 'IBX', '120/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Commando Posporo X120';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-47934', '47934')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Dipsea Jumbo 32G 10S X5', v_supplier_1010, 'DIPSEA', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Dipsea Jumbo 32G 10S X5';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-DIPSEA', 'DIPSEA')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Hany Milk Chocolate 16X20', v_supplier_1010, 'HANNY', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Hany Milk Chocolate 16X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-HANNY', 'HANNY')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Hany Peanut Choco 24X20', v_supplier_1010, 'HANYJR', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Hany Peanut Choco 24X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-HANYJR', 'HANYJR')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Hany Langka 24X20', v_supplier_1010, 'HANYLANGKA', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Hany Langka 24X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-HANYLANGKA', 'HANYLANGKA')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Hany Langka Ube 24X20', v_supplier_1010, 'HANYLANGK', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Hany Langka Ube 24X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-HANYLANGK', 'HANYLANGK')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Hany Ube 24X20', v_supplier_1010, 'HANYUBE', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Hany Ube 24X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-HANYUBE', 'HANYUBE')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Ice Gem Biscuits 12X20', v_supplier_1010, 'IG001', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Ice Gem Biscuits 12X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-IG001', 'IG001')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Ice Gem Choco 12X20', v_supplier_1010, 'ICEGEMCHOC', 'PACK', '20/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Ice Gem Choco 12X20';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-ICEGEMCHOC', 'ICEGEMCHOC')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Oishi Pillows Choco 24G', v_supplier_1010, 'PILLOWS CH', 'PACK', '10/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Oishi Pillows Choco 24G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-PILLOWS CH', 'PILLOWS CH')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Oishi Pillows Ube 24G', v_supplier_1010, 'PILLOWS UB', 'PACK', '10/CAS', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Oishi Pillows Ube 24G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-PILLOWS UB', 'PILLOWS UB')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Pompoms Cheese Jumbo 10X5', v_supplier_1010, 'POM', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Pompoms Cheese Jumbo 10X5';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-POM', 'POM')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Pritong Bangus 10X10', v_supplier_1010, 'PRITONGBAN', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Pritong Bangus 10X10';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-PRITONGBAN', 'PRITONGBAN')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Pritong Manok 5X10S', v_supplier_1010, 'PRITONG MA', 'BDL', '1/BDL', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Pritong Manok 5X10S';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, '101-PRITONG MA', 'PRITONG MA')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- 1010 — Products with size variants
  -- ──────────────────────────────────────────────────────────

  -- Parent: Kendi Mint
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Kendi Mint', v_supplier_1010, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Kendi Mint';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, 'Kendi Mint 100 X20', 0.00, 0, '101-48325', '48325'),
    (v_product_id, 'Kendi Mint 50X60',   0.00, 0, '101-48326', '48326')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- AS77 — Separate products (flavor/type differences)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Libbys Vienna Sausage 18', v_supplier_as77, '47892', 'PC', '18/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Libbys Vienna Sausage 18';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AS7-47892', '47892')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Maling LM Chicken 397G', v_supplier_as77, '47894', 'PC', '48/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Maling LM Chicken 397G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AS7-47894', '47894')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Maling LM Chicken 170G', v_supplier_as77, '47895', 'PC', '48/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Maling LM Chicken 170G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AS7-47895', '47895')
  ON CONFLICT (sku) DO NOTHING;

  INSERT INTO public.products (name, supplier_id, item_code, unit, doz_pckg, category, is_active)
  VALUES ('Royal Smokehouse Chicken LM340G', v_supplier_as77, 'ROYALLM340', 'PC', '24/CASE', 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Royal Smokehouse Chicken LM340G';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES (v_product_id, 'Default', 0.00, 0, 'AS7-ROYALLM340', 'ROYALLM340')
  ON CONFLICT (sku) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- AS77 — Products with size variants
  -- ──────────────────────────────────────────────────────────

  -- Parent: CDO Karne Norte
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('CDO Karne Norte', v_supplier_as77, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'CDO Karne Norte';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, '100G', 0.00, 0, 'AS7-47886', '47886'),
    (v_product_id, '150G', 0.00, 0, 'AS7-47887', '47887'),
    (v_product_id, '175G', 0.00, 0, 'AS7-47888', '47888'),
    (v_product_id, '260G', 0.00, 0, 'AS7-47889', '47889')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: CDO Meatloaf
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('CDO Meatloaf', v_supplier_as77, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'CDO Meatloaf';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, '100G', 0.00, 0, 'AS7-47883', '47883'),
    (v_product_id, '150G', 0.00, 0, 'AS7-47884', '47884'),
    (v_product_id, '210G', 0.00, 0, 'AS7-47885', '47885')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: Phillips Meatloaf
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Phillips Meatloaf', v_supplier_as77, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Phillips Meatloaf';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, '150G', 0.00, 0, 'AS7-PHILLPSMLO', 'PHILLPSMLO'),
    (v_product_id, '200G', 0.00, 0, 'AS7-PHLLIPSMLO', 'PHLLIPSMLO')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: Phillips Sausage
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Phillips Sausage', v_supplier_as77, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Phillips Sausage';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, '114G',            0.00, 0, 'AS7-PHILLIPS11',  'PHILLIPS11'),
    (v_product_id, '225G Franturter', 0.00, 0, 'AS7-PHIL SAUSA',  'PHIL SAUSA'),
    (v_product_id, 'Vienna 70G',      0.00, 0, 'AS7-PHILLIPSVIE', 'PHILLIPSVIE')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: Pocari Sweat
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('Pocari Sweat', v_supplier_as77, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'Pocari Sweat';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, '350ML', 0.00, 0, 'AS7-POCARI350M', 'POCARI350M'),
    (v_product_id, '500ML', 0.00, 0, 'AS7-47653',      '47653'),
    (v_product_id, '900ML', 0.00, 0, 'AS7-POCARI900M', 'POCARI900M'),
    (v_product_id, '2L',    0.00, 0, 'AS7-POCARI 2L',  'POCARI 2L')
  ON CONFLICT (sku) DO NOTHING;

  -- Parent: San Marino Red
  INSERT INTO public.products (name, supplier_id, category, is_active)
  VALUES ('San Marino Red', v_supplier_as77, 'Food & Pantry', true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_product_id FROM public.products WHERE name = 'San Marino Red';
  INSERT INTO public.product_variants (product_id, variant_label, price, stock, sku, item_code)
  VALUES
    (v_product_id, '100G', 0.00, 0, 'AS7-47915', '47915'),
    (v_product_id, '150G', 0.00, 0, 'AS7-47917', '47917')
  ON CONFLICT (sku) DO NOTHING;

END $$;

COMMIT;
