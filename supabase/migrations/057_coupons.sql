-- 057_coupons.sql
-- Coupon System: Database tables, RLS, and updated checkout RPC

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'free_shipping'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_purchase numeric NOT NULL DEFAULT 0,
  usage_limit integer, -- NULL = unlimited
  per_user_limit integer NOT NULL DEFAULT 1,
  usage_count integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);

-- 2. Create coupon_usages table
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  used_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coupon_usages_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id),
  CONSTRAINT coupon_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT coupon_usages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT coupon_usages_order_id_unique UNIQUE (order_id) -- one coupon per order
);
  
-- 3. Update orders table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='applied_coupon_id') THEN
    ALTER TABLE public.orders ADD COLUMN applied_coupon_id uuid REFERENCES public.coupons(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount_amount') THEN
    ALTER TABLE public.orders ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- admins can do everything on coupons
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'admin_all_coupons') THEN
    CREATE POLICY "admin_all_coupons" ON public.coupons
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  -- customers can only read active coupons (for validation display)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'customer_read_active_coupons') THEN
    CREATE POLICY "customer_read_active_coupons" ON public.coupons
      FOR SELECT USING (status = 'active');
  END IF;

  -- coupon_usages policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_usages' AND policyname = 'admin_all_coupon_usages') THEN
    CREATE POLICY "admin_all_coupon_usages" ON public.coupon_usages
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_usages' AND policyname = 'user_own_coupon_usages') THEN
    CREATE POLICY "user_own_coupon_usages" ON public.coupon_usages
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- 6. Update process_checkout RPC
CREATE OR REPLACE FUNCTION public.process_checkout(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_total NUMERIC; -- This is the final total from payload
  v_items JSONB;
  v_shipping_address_id UUID;
  v_shipping_method TEXT;
  v_shipping_cost NUMERIC;
  v_payment_method TEXT;
  v_idempotency_key TEXT;
  
  -- Coupon fields
  v_applied_coupon_id UUID;
  v_coupon_code TEXT;
  v_coupon_type TEXT;
  v_coupon_discount_value NUMERIC;
  v_coupon_min_purchase NUMERIC;
  v_coupon_usage_limit INTEGER;
  v_coupon_per_user_limit INTEGER;
  v_coupon_usage_count INTEGER;
  v_coupon_starts_at TIMESTAMP WITH TIME ZONE;
  v_coupon_expires_at TIMESTAMP WITH TIME ZONE;
  v_coupon_status TEXT;
  
  v_calculated_subtotal NUMERIC := 0;
  v_calculated_discount_amount NUMERIC := 0;
  v_calculated_final_total NUMERIC := 0;
  
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  
  v_order_id UUID;
  v_created_order JSONB;
  v_user_usage_count INTEGER;
BEGIN
  -- Extract common fields from payload
  v_user_id := (payload->>'user_id')::UUID;
  v_status := payload->>'status';
  v_total := (payload->>'total')::NUMERIC;
  v_items := payload->'items';
  v_shipping_address_id := (payload->>'shipping_address_id')::UUID;
  v_shipping_method := payload->>'shipping_method';
  v_shipping_cost := COALESCE((payload->>'shipping_cost')::NUMERIC, 0);
  v_payment_method := payload->>'payment_method';
  v_idempotency_key := payload->>'idempotency_key';
  
  -- Coupon info from payload
  v_applied_coupon_id := (payload->>'applied_coupon_id')::UUID;

  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Checkout requires at least one item';
  END IF;

  -- 1. Idempotency Check
  IF v_idempotency_key IS NOT NULL THEN
    SELECT row_to_json(o) INTO v_created_order
    FROM public.orders o
    WHERE o.idempotency_key = v_idempotency_key;
    
    IF v_created_order IS NOT NULL THEN
      RETURN jsonb_build_object(
        'data', v_created_order,
        'duplicate', true,
        'message', 'Order already exists with this idempotency key'
      );
    END IF;
  END IF;

  -- 2. Calculate Subtotal and Validate Stock using Row-level Locks
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_calculated_subtotal := v_calculated_subtotal + ((v_item->>'price')::NUMERIC * v_quantity);
    
    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Item "%" is missing variant_id', v_item->>'name';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item "%": must be a positive integer', v_item->>'name';
    END IF;

    SELECT stock INTO v_current_stock
    FROM public.product_variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Variant % not found', v_variant_id;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Out of stock: Only % left for item "%"', v_current_stock, v_item->>'name';
    END IF;
  END LOOP;

  -- 3. Coupon Validation and Calculation
  IF v_applied_coupon_id IS NOT NULL THEN
    -- Lock the coupon row for update to ensure atomicity of usage_count
    SELECT 
      code, type, discount_value, min_purchase, usage_limit, per_user_limit, usage_count, starts_at, expires_at, status
    INTO 
      v_coupon_code, v_coupon_type, v_coupon_discount_value, v_coupon_min_purchase, v_coupon_usage_limit, v_coupon_per_user_limit, v_coupon_usage_count, v_coupon_starts_at, v_coupon_expires_at, v_coupon_status
    FROM public.coupons
    WHERE id = v_applied_coupon_id
    FOR UPDATE;

    IF v_coupon_code IS NULL THEN
      RAISE EXCEPTION 'Coupon not found';
    END IF;

    IF v_coupon_status != 'active' THEN
      RAISE EXCEPTION 'Coupon is no longer active';
    END IF;

    IF v_coupon_starts_at IS NOT NULL AND v_coupon_starts_at > NOW() THEN
      RAISE EXCEPTION 'Coupon is not yet active';
    END IF;

    IF v_coupon_expires_at IS NOT NULL AND v_coupon_expires_at < NOW() THEN
      RAISE EXCEPTION 'Coupon has expired';
    END IF;

    IF v_calculated_subtotal < v_coupon_min_purchase THEN
      RAISE EXCEPTION 'Minimum purchase of % not met for this coupon', v_coupon_min_purchase;
    END IF;

    IF v_coupon_usage_limit IS NOT NULL AND v_coupon_usage_count >= v_coupon_usage_limit THEN
      RAISE EXCEPTION 'Coupon usage limit has been reached';
    END IF;

    -- Check per-user limit
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usages
    WHERE coupon_id = v_applied_coupon_id AND user_id = v_user_id;

    IF v_user_usage_count >= v_coupon_per_user_limit THEN
      RAISE EXCEPTION 'You have reached the usage limit for this coupon';
    END IF;

    -- Calculate discount
    IF v_coupon_type = 'percentage' THEN
      v_calculated_discount_amount := v_calculated_subtotal * (v_coupon_discount_value / 100);
    ELSIF v_coupon_type = 'fixed' THEN
      v_calculated_discount_amount := LEAST(v_coupon_discount_value, v_calculated_subtotal);
    ELSIF v_coupon_type = 'free_shipping' THEN
      v_calculated_discount_amount := 0;
      v_shipping_cost := 0;
    END IF;
  END IF;

  v_calculated_final_total := GREATEST(v_calculated_subtotal - v_calculated_discount_amount + v_shipping_cost, 0);

  -- 4. Verify Total (optional but recommended)
  -- IF ABS(v_total - v_calculated_final_total) > 0.01 THEN
  --   RAISE EXCEPTION 'Total mismatch: expected %, got %', v_calculated_final_total, v_total;
  -- END IF;
  
  -- We will use our calculated total to be safe, or just use what client sent if it matches within a cent
  v_total := v_calculated_final_total;

  -- 5. Deduct Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    UPDATE public.product_variants
    SET stock = stock - v_quantity,
        updated_at = NOW()
    WHERE id = v_variant_id;
  END LOOP;

  -- 6. Create Order head
  INSERT INTO public.orders (
    user_id,
    status,
    total,
    items,
    shipping_address_id,
    payment_method,
    idempotency_key,
    shipping_method,
    shipping_cost,
    applied_coupon_id,
    discount_amount
  ) VALUES (
    v_user_id,
    v_status,
    v_total,
    v_items,
    v_shipping_address_id,
    v_payment_method,
    v_idempotency_key,
    v_shipping_method,
    v_shipping_cost,
    v_applied_coupon_id,
    v_calculated_discount_amount
  ) RETURNING id INTO v_order_id;

  -- 7. Record Coupon Usage
  IF v_applied_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_usages (
      coupon_id,
      user_id,
      order_id
    ) VALUES (
      v_applied_coupon_id,
      v_user_id,
      v_order_id
    );

    UPDATE public.coupons
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = v_applied_coupon_id;
  END IF;

  -- 8. Insert into order_items table
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id, 
      quantity,
      price,
      image
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC,
      (v_item->>'image')
    );
  END LOOP;

  -- 9. Insert into order_status_history
  INSERT INTO public.order_status_history (
    order_id,
    new_status,
    changed_by,
    notes
  ) VALUES (
    v_order_id,
    v_status,
    v_user_id,
    'Order created via updated checkout RPC with coupon support'
  );

  SELECT row_to_json(o) INTO v_created_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN jsonb_build_object(
    'data', v_created_order,
    'duplicate', false,
    'message', 'Order created successfully'
  );
END;
$$;
