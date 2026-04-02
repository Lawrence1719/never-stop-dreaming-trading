BEGIN;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

DO $$
DECLARE
  deleted_product_id uuid;
  deleted_account_id uuid;
  orphaned_order_items_count integer := 0;
  orphaned_orders_count integer := 0;
  placeholder_email constant text := 'deleted@account.com';
BEGIN
  SELECT COUNT(*)
  INTO orphaned_order_items_count
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.product_id IS NOT NULL
    AND p.id IS NULL;

  IF orphaned_order_items_count > 0 THEN
    SELECT id
    INTO deleted_product_id
    FROM public.products
    WHERE name = 'Deleted Product'
      AND description = 'This product has been removed'
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    IF deleted_product_id IS NULL THEN
      INSERT INTO public.products (
        name,
        description,
        is_active,
        deleted_at,
        created_at,
        updated_at
      )
      VALUES (
        'Deleted Product',
        'This product has been removed',
        false,
        now(),
        now(),
        now()
      )
      RETURNING id INTO deleted_product_id;
    ELSE
      UPDATE public.products
      SET
        is_active = false,
        deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
      WHERE id = deleted_product_id;
    END IF;

    UPDATE public.order_items oi
    SET product_id = deleted_product_id
    WHERE oi.product_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = oi.product_id
      );
  END IF;

  SELECT COUNT(*)
  INTO orphaned_orders_count
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.user_id IS NOT NULL
    AND p.id IS NULL;

  IF orphaned_orders_count > 0 THEN
    SELECT id
    INTO deleted_account_id
    FROM public.profiles
    WHERE email = placeholder_email
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    IF deleted_account_id IS NULL THEN
      deleted_account_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        is_sso_user,
        is_anonymous
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        deleted_account_id,
        'authenticated',
        'authenticated',
        placeholder_email,
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Deleted Account","role":"customer"}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        '',
        false,
        false
      );

      INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        deleted_at,
        created_at
      )
      VALUES (
        deleted_account_id,
        'Deleted Account',
        placeholder_email,
        'customer',
        now(),
        now()
      );
    ELSE
      UPDATE public.profiles
      SET
        name = 'Deleted Account',
        email = placeholder_email,
        role = 'customer',
        deleted_at = COALESCE(deleted_at, now())
      WHERE id = deleted_account_id;
    END IF;

    UPDATE public.orders o
    SET user_id = deleted_account_id
    WHERE o.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = o.user_id
      );
  END IF;

  RAISE NOTICE 'Fixed orphaned order_items: %', orphaned_order_items_count;
  RAISE NOTICE 'Fixed orphaned orders: %', orphaned_orders_count;
END $$;

COMMIT;
