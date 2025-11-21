# Cart Table

This document describes the `cart` table used to persist authenticated user carts.

Suggested migration filename: `supabase/migrations/004_create_cart_table.sql`

Example schema:

```sql
CREATE TABLE public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text, -- optional: session identifier for guest carts (nullable)
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Notes:
- Use `user_id` for authenticated-user carts; guest carts can be tracked in-memory or by `session_id` if you prefer persistence.
- A unique constraint on `(user_id, product_id)` (or `(session_id, product_id)`) can simplify upserts during migration.

Example upsert (add or increment):

```sql
INSERT INTO cart (user_id, product_id, quantity)
VALUES ('<USER_UUID>','<PRODUCT_UUID>', 2)
ON CONFLICT (user_id, product_id)
DO UPDATE SET quantity = cart.quantity + EXCLUDED.quantity, updated_at = now();
```

RLS suggestion:

```sql
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart: owner can access"
  ON public.cart FOR ALL
  USING (auth.uid() = user_id::text);
```

Bulk delete (clear user's cart):

```sql
DELETE FROM public.cart WHERE user_id = '<USER_UUID>';
```
