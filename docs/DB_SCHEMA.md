# Database Schema (Added Tables)

This document summarizes the additional tables introduced for cart/checkout functionality in the Never Stop Dreaming Trading project. It complements the existing docs (see `docs/AUTHENTICATION.md`, `docs/ORDERS.md`, `docs/PRODUCTS.md`).

The new tables covered here:
- `cart`
- `wishlist`
- `addresses`
- `order_items` (if you prefer normalized orders alongside `orders`)

All examples assume a Supabase/Postgres backend and the typical `auth.users` table for authentication.

---

## `cart`
Stores a user's saved cart rows (one row per product in a user's cart).

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
- Example upsert (add or increment):

```sql
INSERT INTO cart (user_id, product_id, quantity)
# Database Schema Index

This repository previously contained a combined `DB_SCHEMA.md` with multiple table definitions. Those sections have been split into separate files for easier navigation.

See the individual table docs:

- `docs/CART.md` — `cart` table schema and examples
- `docs/WISHLIST.md` — `wishlist` table schema and examples
- `docs/ADDRESSES.md` — `addresses` (shipping/billing) schema and examples
- `docs/ORDER_ITEMS.md` — `order_items` schema (optional normalized line items)

If you still want a single consolidated file, I can keep a combined version as well; otherwise this index will help navigate the per-table docs.