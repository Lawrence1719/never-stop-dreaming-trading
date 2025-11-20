# Orders Table

This document describes a simple `orders` table suitable for a capstone project. The schema is intentionally minimal to keep implementation and testing straightforward.

Schema (migration): `supabase/migrations/003_create_orders_table.sql`

- **id**: UUID primary key (default generated)
- **user_id**: UUID referencing `profiles(id)` (nullable; set to NULL if profile deleted)
- **status**: TEXT with simple states (`pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`)
- **total**: NUMERIC(10,2) — order total
- **items**: JSONB — array of line items (product_id, name, quantity, price). Keeps order line details in a single column for simplicity
- **shipping_address**: JSONB — free-form shipping address object
- **payment_method**: TEXT — e.g. `card`, `cash`, `paypal`
- **created_at** / **updated_at**: timestamps (defaults and trigger to update `updated_at`)

Why this shape?
- Simple and easy to query for common capstone flows (list orders for a user, inspect items).
- JSONB `items` avoids creating a separate `order_items` table while still preserving structure for display and basic queries.

Example queries

- Create the table (run the migration file in Supabase SQL Editor or via CLI):
  - In Supabase Studio: open **SQL Editor** and run the contents of `supabase/migrations/003_create_orders_table.sql`.
  - Or use the Supabase CLI / migrations flow: `supabase db push` or apply migrations in order.

- Insert example:
  ```sql
  INSERT INTO public.orders (user_id, status, total, items, shipping_address, payment_method)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'pending',
    59.95,
    '[{"product_id":"p-002","name":"Eggs","quantity":2,"price":3.99}]'::jsonb,
    '{"line1":"123 Main St","city":"Town","postal":"12345"}'::jsonb,
    'card'
  );
  ```

- Select orders for a user:
  ```sql
  SELECT * FROM public.orders WHERE user_id = '<USER_UUID>' ORDER BY created_at DESC;
  ```

- Read items from JSONB (example: get first item's name):
  ```sql
  SELECT items->0->>'name' AS first_item_name FROM public.orders WHERE id = '<ORDER_UUID>';
  ```

Row Level Security (RLS) recommendation
- For a capstone, enable RLS if you want to restrict users to their own orders:
  ```sql
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can access their own orders"
    ON public.orders FOR SELECT USING (auth.uid() = user_id::text);
  ```

Notes & next steps
- This schema favours simplicity. If you need normalized order line items for analytics or bulk updates, add an `order_items` table later.
- After running the migration, ensure your client has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set and restart the dev server.
