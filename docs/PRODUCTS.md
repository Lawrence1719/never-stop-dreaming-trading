# Products table (Supabase)

This document contains SQL to create a simple `products` table suitable for the customer-facing catalog. It also includes Row Level Security (RLS) guidance and notes for applying the SQL in Supabase or via migrations.

---

## SQL (create table + RLS policies)

Run the following SQL in Supabase Studio → SQL Editor, or include it in your migration files.

```sql
-- Ensure pgcrypto is available (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  sku TEXT UNIQUE NOT NULL,
  stock INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (products are public for reading)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
-- Anyone (public) can view products
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO PUBLIC
  USING (true);

-- Only authenticated users (or admins) can insert products
CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- (Optional) If you want only admins to insert/update/delete, adjust the policy to check the role in your profiles table, e.g.:
-- USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))

-- Index recommendations
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
-- Index for SKU already created by UNIQUE constraint; consider an index for reorder checks
CREATE INDEX IF NOT EXISTS idx_products_reorder_threshold ON products(reorder_threshold);
```

---

## Notes and considerations

- `price` type: The SQL uses `NUMERIC(10, 2)` which is preferable for money to avoid floating-point rounding issues. In some schemas `DECIMAL` is used; `NUMERIC` and `DECIMAL` are equivalent in Postgres, but prefer `NUMERIC` for clarity.
- RLS: The example allows public SELECTs so customers can browse products without authentication. If you need to restrict visibility by region, availability, or other rules, update the SELECT policy.
- Admin-only modifications: The provided INSERT policy allows any authenticated user to insert products. For production, restrict INSERT/UPDATE/DELETE to admins by checking your `profiles.role = 'admin'` similar to the notifications example.
- Catalog search & performance: Consider adding full-text search indexes (GIN on to_tsvector(name || ' ' || description)) when implementing search.
- Images: `image_url` stores a URL; if you plan uploads via Supabase Storage, record the storage path or use signed URLs as needed.

### Additional recommended columns (added by migration)

- `sku TEXT UNIQUE NOT NULL` — A Stock Keeping Unit is essential for inventory tracking, integrations, barcode labels, and 3rd-party connectors. In the migration we populate existing rows with a UUID default to avoid NULL values — for production you may want to replace those with meaningful SKUs.

- `reorder_threshold INTEGER DEFAULT 5` — Enables proactive inventory alerts when `stock <= reorder_threshold`.

- `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()` — Useful for auditing and cache invalidation. We also added a DB trigger to update this column on row updates.

- `is_active BOOLEAN DEFAULT true` — Soft-deletion flag to hide discontinued items without removing historical data.

Best practices & notes:
- If you require SKU values to follow a specific pattern (e.g., PREFIX-0001), populate or transform the UUID defaults with a migration script that assigns canonical SKUs and then drop the UUID default if desired.
- The migration we added (`supabase/migrations/20251120090000_add_product_inventory_columns.sql`) sets a UUID default for `sku` to guarantee non-null unique values for existing rows. Review and replace these with real SKUs as needed.
- Consider adding database-level checks or a small admin UI to bulk-edit SKUs for imported data.

## Applying the SQL

1. Supabase Studio (recommended for quick apply):
   - Open your project at https://app.supabase.com
   - Go to **SQL Editor** → **New query** and paste the SQL above.
   - Run the query.

2. Migration (recommended for reproducibility):
   - Add the SQL to your migrations folder (e.g. `supabase/migrations/YYYYMMDDHHMMSS_create_products.sql`).
   - Run your migration tooling or apply via CI.

3. psql / CLI:
   - Use `psql` or another client to connect to the database and execute the SQL.

## Troubleshooting

- If you see permission errors when inserting/updating, verify RLS policies and that the client is authenticated properly.
- If `gen_random_uuid()` is not available, ensure `pgcrypto` extension is enabled or switch to `uuid_generate_v4()` with `uuid-ossp`.

---

If you want, I can:
- Add a migration file under `supabase/migrations/` with this SQL.
- Add a GIN full-text index example for product search.
- Update front-end types or API endpoints to expect the `products` schema.

Created by: developer docs generator
