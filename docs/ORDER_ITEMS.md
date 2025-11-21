# Order Items (optional)

This document describes the `order_items` table for normalized order line items.

Suggested migration filename: `supabase/migrations/007_create_order_items_table.sql`

Example schema:

```sql
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX order_items_order_idx ON public.order_items(order_id);
```

Notes:
- Keep a denormalized copy of name/price in `orders` or `order_items` to preserve historical pricing even if the `products` table changes later.
- Use `order_items` when you need easier analytic queries or want to avoid JSONB parsing.
