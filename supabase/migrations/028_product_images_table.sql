-- Migration: Create product_images table for rich gallery support
-- Timestamp: 2026-03-20
-- Purpose: Normalized storage for multiple product images with sorting and primary image support

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Migrate existing data from image_url (if not already migrated)
-- We take product items that don't have a primary image yet and use their image_url
INSERT INTO public.product_images (product_id, storage_path, is_primary)
SELECT id, image_url, true
FROM public.products
WHERE image_url IS NOT NULL 
AND image_url != ''
AND NOT EXISTS (
    SELECT 1 FROM public.product_images WHERE product_id = products.id AND is_primary = true
);

-- 3. Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Anyone can view product images"
    ON public.product_images FOR SELECT
    USING (true);

CREATE POLICY "Admin can manage product images"
    ON public.product_images FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS product_images_sort_order_idx ON public.product_images(sort_order);

-- 6. Add comment for documentation
COMMENT ON TABLE public.product_images IS 'Stores multiple image references for products, pointing to Supabase Storage paths';
