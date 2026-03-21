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


CREATE TABLE public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text, -- optional: session identifier for guest carts (nullable)
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


INSERT INTO cart (user_id, product_id, quantity)
VALUES ('<USER_UUID>','<PRODUCT_UUID>', 2)
ON CONFLICT (user_id, product_id)
DO UPDATE SET quantity = cart.quantity + EXCLUDED.quantity, updated_at = now();


ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart: owner can access"
  ON public.cart FOR ALL
  USING (auth.uid() = user_id::text);


DELETE FROM public.cart WHERE user_id = '<USER_UUID>';


CREATE TABLE public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX wishlist_user_product_idx ON public.wishlist(user_id, product_id);


ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist: owner can access"
  ON public.wishlist FOR ALL
  USING (auth.uid() = user_id::text);


CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX order_items_order_idx ON public.order_items(order_id);


