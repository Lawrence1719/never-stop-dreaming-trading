-- 003_create_orders_table.sql
-- Simple orders table for capstone project

-- Create table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled')),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_address JSONB,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- Helper function to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at on update
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.orders;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_column();

-- Simple example: insert an order
-- INSERT INTO public.orders (user_id, status, total, items, shipping_address, payment_method)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'pending', 29.99, '[{"product_id":"p-001","name":"Milk","quantity":1,"price":2.99}]'::jsonb, '{"line1":"123 Main St","city":"Town"}'::jsonb, 'card');
