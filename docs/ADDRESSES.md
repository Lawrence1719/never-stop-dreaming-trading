# Addresses Table

This document describes the `addresses` table which stores shipping and billing addresses for users.

Suggested migration filename: `supabase/migrations/006_create_addresses_table.sql`

Example schema:

```sql
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  street_address text NOT NULL,
  city text NOT NULL,
  province text,
  zip_code text,
  country text DEFAULT 'US',
  is_default boolean DEFAULT false,
  address_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX addresses_user_idx ON public.addresses(user_id);
```

Notes:
- When setting an address as default, ensure you unset other default flags for the user in a single transaction to avoid multiple defaults.

Example (pseudo):

```sql
BEGIN;
UPDATE addresses SET is_default = false WHERE user_id = '<USER_UUID>' AND is_default = true;
INSERT INTO addresses (...) VALUES (...) RETURNING id;
COMMIT;
```

RLS suggestion:

```sql
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Addresses: owner can access"
  ON public.addresses FOR ALL
  USING (auth.uid() = user_id::text);
```
