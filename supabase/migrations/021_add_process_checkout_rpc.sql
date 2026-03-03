-- Migration: Add process_checkout RPC for atomic order creation and stock deduction
-- Timestamp: 2026-03-03
-- Purpose: Fix checkout race conditions by deducting stock and creating orders within a single transaction.

CREATE OR REPLACE FUNCTION process_checkout(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_shipping_cost := (payload->>'shipping_cost')::NUMERIC;
  v_payment_method := payload->>'payment_method';
  v_idempotency_key := payload->>'idempotency_key';

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

  -- 4. Create Order
  INSERT INTO public.orders (
    user_id,
    status,
    total,
    items,
    shipping_address_id,
    payment_method,
    idempotency_key
  ) VALUES (
    v_user_id,
    v_status,
    v_total,
    v_items,
    v_shipping_address_id,
    v_payment_method,
    v_idempotency_key
  ) RETURNING id INTO v_order_id;

  -- 5. Insert into order_items table
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC
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
    'Order created via checkout'
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
