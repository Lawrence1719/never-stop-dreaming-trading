# Notifications table (Supabase)

This document contains SQL to create a `notifications` table in Supabase, enable Row Level Security (RLS), add sensible policies for user/admin access, and create helpful indexes. Use this file as a reference when adding notifications support to your project.

---

## SQL (create table + RLS policies)

Run the following SQL in Supabase Studio → SQL Editor, or include it in your migration files.

```sql
-- Ensure pgcrypto is available (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System/admins can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
```

---

## Notes and considerations

- gen_random_uuid(): The SQL uses `gen_random_uuid()` (provided by the `pgcrypto` extension). If you prefer `uuid_generate_v4()`, enable the `uuid-ossp` extension and adjust accordingly.
- `profiles` table: The admin policies assume you have a `profiles` table (or similar) with a `role` column where `profiles.id = auth.uid()` and `profiles.role = 'admin'`. If your project stores roles somewhere else, adjust the policy queries to match your schema.
- Column names: The application code references `read` in the UI; the SQL uses `is_read`. If your front-end expects `read` (without `is_`), rename the column or update the front-end mapping. Keep names consistent across code and migrations.
- RLS: Row Level Security must be enabled and policies created before the client application can read/write rows when authenticated. Make sure your Supabase API key and client configuration are pointing to the correct project.

## Applying the SQL

1. Supabase Studio (recommended for quick apply):
   - Open your project at https://app.supabase.com
   - Go to **SQL Editor** → **New query** and paste the SQL above.
   - Run the query.

2. Migration (recommended for reproducibility):
   - Add the SQL to your migrations folder (e.g. `supabase/migrations/YYYYMMDDHHMMSS_create_notifications.sql`).
   - Run your migration tooling (or copy the SQL into Supabase Studio if you don't use migrations).

3. psql / CLI:
   - Use `psql` or another client to connect to the database and execute the SQL.

## Troubleshooting

- Error: "Could not find the table 'public.notifications' in the schema cache" — means the table doesn't exist on the connected project. Run the SQL above to create the table or point the client to the correct Supabase project.
- If queries return permission errors, verify RLS policies and that the client is authenticated correctly (the JWT from Supabase Auth maps `auth.uid()` to the user's id).
- If you see an error when calling `gen_random_uuid()`, ensure the `pgcrypto` extension is enabled.

## Example: Minimal notification insert (admin/system)

```sql
INSERT INTO notifications (user_id, title, message, type, link)
VALUES ('<user-uuid>', 'New order', 'Your order #1234 has shipped', 'order', '/orders/1234');
```

---

If you'd like, I can:
- Add a migration file under `supabase/migrations/` with this SQL.
- Update front-end code to expect `is_read` vs `read` consistently.
- Add a short `docs/` reference link from `docs/AUTHENTICATION.md` or `README.md`.

Created by: developer docs generator
