-- Create categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- Seed with initial categories from MAIN_CATEGORIES
INSERT INTO public.categories (name, slug, sort_order)
VALUES 
  ('Uncategorized', 'uncategorized', 0),
  ('Food & Pantry', 'food-pantry', 1),
  ('Beverages', 'beverages', 2),
  ('Household Essentials', 'household-essentials', 3),
  ('Personal Care', 'personal-care', 4),
  ('Refrigerated & Frozen', 'refrigerated-frozen', 5)
ON CONFLICT (name) DO NOTHING;

-- Seed with unique categories existing in products table that might not be in MAIN_CATEGORIES
INSERT INTO public.categories (name, slug)
SELECT DISTINCT 
  category, 
  LOWER(REPLACE(REPLACE(category, ' & ', '-'), ' ', '-'))
FROM public.products
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Grant permissions (assuming standard Supabase roles)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for active categories" ON public.categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow admin all access" ON public.categories
    FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin'));

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
