-- Migration: Filter Sales Reporting to REAL Products Only
-- Timestamp: 2026-04-21
-- This version EXCLUDES orders for products that have been deleted.
-- It ensures that only your current "Real" products and categories are shown.

-- ============================================================
-- 1. Updated get_sales_by_category_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION get_sales_by_category_rpc(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  category TEXT,
  sales BIGINT,
  revenue NUMERIC,
  percent NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $cat$
  WITH raw_data AS (
    -- Only include items where the product STILL EXISTS in the products table
    SELECT
      p.category AS cat_name,
      (item->>'quantity')::INTEGER AS qty,
      ((item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC) AS price_total
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    JOIN public.products p ON p.id = (item->>'product_id')::UUID -- INNER JOIN filters out deleted products
    WHERE o.status NOT IN ('cancelled', 'duplicate')
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND jsonb_typeof(o.items) = 'array'
  ),
  aggregated AS (
    SELECT
      COALESCE(cat_name, 'Uncategorized') as cat_name,
      SUM(qty)::BIGINT AS total_sales,
      SUM(price_total)::NUMERIC AS total_revenue
    FROM raw_data
    GROUP BY 1
  ),
  grand_total AS (
    SELECT SUM(total_revenue) as grand_rev FROM aggregated
  )
  SELECT
    a.cat_name as category,
    a.total_sales as sales,
    a.total_revenue as revenue,
    CASE 
      WHEN g.grand_rev > 0 THEN ROUND((a.total_revenue / g.grand_rev) * 100, 2)
      ELSE 0
    END as percent
  FROM aggregated a
  CROSS JOIN grand_total g
  ORDER BY a.total_revenue DESC;
$cat$;

-- ============================================================
-- 2. Updated get_top_products_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_products_rpc(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE (
  name    TEXT,
  sold    BIGINT,
  revenue NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $prod$
  WITH product_data AS (
    -- Only include items where the product STILL EXISTS in the products table
    SELECT
      p.name AS prod_name,
      (item->>'quantity')::INTEGER AS qty,
      ((item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC) AS price_total
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    JOIN public.products p ON p.id = (item->>'product_id')::UUID -- INNER JOIN filters out deleted products
    WHERE o.status NOT IN ('cancelled', 'duplicate')
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND jsonb_typeof(o.items) = 'array'
  )
  SELECT
    prod_name as name,
    SUM(qty)::BIGINT as sold,
    SUM(price_total)::NUMERIC as revenue
  FROM product_data
  GROUP BY prod_name
  ORDER BY revenue DESC
  LIMIT p_limit;
$prod$;