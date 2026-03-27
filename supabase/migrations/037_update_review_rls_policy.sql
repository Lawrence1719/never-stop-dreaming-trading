-- 037_update_review_rls_policy.sql
-- Update the RLS policy for review insertion to support 'completed' status

DROP POLICY IF EXISTS "Users can insert reviews for delivered products" ON public.reviews;

CREATE POLICY "Users can insert reviews for delivered or completed products" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.user_id = auth.uid()
            AND o.id = order_id
            AND (o.status = 'delivered' OR o.status = 'completed')
            AND (
                -- Check order_items table if it exists
                product_id IN (SELECT product_id FROM public.order_items WHERE order_id = o.id)
                OR
                -- Fallback to items JSONB
                o.items @> format('[{"product_id": "%s"}]', product_id)::jsonb
            )
        )
    );
