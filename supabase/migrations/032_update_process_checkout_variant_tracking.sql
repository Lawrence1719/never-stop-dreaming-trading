-- Migration: Update process_checkout RPC to include variant_id, image and shipping info
-- Timestamp: 2026-03-26
-- Purpose: 
-- 1. Ensure variant information is preserved in the order_items table.
-- 2. Add 'image' column to order_items for easy access.
-- 3. Add 'shipping_method' and 'shipping_cost' columns to orders table.
-- 4. Include shipping_method and shipping_cost in the order creation logic.

-- 1. Add image column to order_items if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='image') THEN
    ALTER TABLE public.order_items ADD COLUMN image TEXT;
  END IF;
END $$;

-- 2. Add shipping columns to orders if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_method') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_method TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_cost') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_cost NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- 3. Update process_checkout function
CREATE OR REPLACE FUNCTION public.process_checkout(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_total NUMERIC;
  v_items JSONB;
  v_shipping_address_id UUID;
  v_shipping_method TEXT;
  v_shipping_cost NUMERIC;
  v_payment_method TEXT;
  v_idempotency_key TEXT;
  
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  
  v_order_id UUID;
  v_created_order JSONB;
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

  -- 2. Validate Stock using Row-level Locks (FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
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

  -- 3. Deduct Stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    UPDATE public.product_variants
    SET stock = stock - v_quantity,
        updated_at = NOW()
    WHERE id = v_variant_id;
  END LOOP;

  -- 4. Create Order head
  INSERT INTO public.orders (
    user_id,
    status,
    total,
    items,
    shipping_address_id,
    payment_method,
    idempotency_key,
    shipping_method,
    shipping_cost
  ) VALUES (
    v_user_id,
    v_status,
    v_total,
    v_items,
    v_shipping_address_id,
    v_payment_method,
    v_idempotency_key,
    v_shipping_method,
    v_shipping_cost
  ) RETURNING id INTO v_order_id;

  -- 5. Insert into order_items table (including variant_id and image)
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

  -- 6. Insert into order_status_history
  INSERT INTO public.order_status_history (
    order_id,
    new_status,
    changed_by,
    notes
  ) VALUES (
    v_order_id,
    v_status,
    v_user_id,
    'Order created via updated checkout RPC (v2)'
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
