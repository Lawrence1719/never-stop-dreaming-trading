-- 026_create_reviews_table.sql
-- Create reviews table and related logic

-- Create table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only review a product once per order
    UNIQUE(user_id, product_id, order_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read reviews
CREATE POLICY "Reviews are readable by everyone" ON public.reviews
    FOR SELECT USING (true);

-- Authenticated users can insert reviews if they have a delivered order for that product
CREATE POLICY "Users can insert reviews for delivered products" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            -- We'll check the items JSONB since older orders might use it, or check order_items if it exists
            WHERE o.user_id = auth.uid()
            AND o.id = order_id
            AND o.status = 'delivered'
            AND (
                -- Check order_items table if it exists
                product_id IN (SELECT product_id FROM public.order_items WHERE order_id = o.id)
                OR
                -- Fallback to items JSONB
                o.items @> format('[{"product_id": "%s"}]', product_id)::jsonb
            )
        )
    );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Function to update product average rating and review count
CREATE OR REPLACE FUNCTION public.update_product_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        -- Calculate new stats
        UPDATE public.products
        SET 
            rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM public.reviews
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            ),
            review_count = (
                SELECT COUNT(*)
                FROM public.reviews
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            )
        WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product stats
CREATE TRIGGER trg_update_product_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_product_rating_stats();

-- Trigger to set updated_at
CREATE TRIGGER trg_set_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
