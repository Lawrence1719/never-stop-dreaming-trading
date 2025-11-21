# Wishlist Table

This document describes the `wishlist` table which stores per-user wishlist entries.

Suggested migration filename: `supabase/migrations/005_create_wishlist_table.sql`

Example schema:

```sql
CREATE TABLE public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX wishlist_user_product_idx ON public.wishlist(user_id, product_id);
```

RLS suggestion:

```sql
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist: owner can access"
  ON public.wishlist FOR ALL
  USING (auth.uid() = user_id::text);
```

Notes:
- Keep a unique index to prevent duplicate wishlist rows per user/product.
- For demo purposes some clients persist wishlist in localStorage; prefer DB persistence for production.
