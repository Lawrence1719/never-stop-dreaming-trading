-- 038_add_rating_columns_to_products.sql
-- Add rating and review_count columns to products and fix the stats trigger

-- 1. Add columns to products table if they don't exist
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 2. Update the trigger function to only count approved reviews
CREATE OR REPLACE FUNCTION public.update_product_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        -- Calculate new stats based ONLY on approved reviews
        UPDATE public.products
        SET 
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM public.reviews
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
                AND status = 'approved'
            ),
            review_count = (
                SELECT COUNT(*)
                FROM public.reviews
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
                AND status = 'approved'
            )
        WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Run an initial sync to populate the new columns correctly
UPDATE public.products p
SET 
    rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE product_id = p.id
        AND status = 'approved'
    ),
    review_count = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE product_id = p.id
        AND status = 'approved'
    );
