-- Migration: Add Reporting RPCs to prevent Node.js memory exhaustion
-- Timestamp: 2026-03-03
-- Purpose: Offload heavy array reductions to Postgres for dashboard analytics

-- 1. Get Top Products RPC
CREATE OR REPLACE FUNCTION get_top_products_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  name TEXT,
  sold BIGINT,
  revenue NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.name, 'Unknown Product') as name,
    SUM(oi.quantity)::BIGINT as sold,
    SUM(oi.quantity * oi.price)::NUMERIC as revenue
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY p.name
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$$;

-- 2. Get Sales By Category RPC
CREATE OR REPLACE FUNCTION get_sales_by_category_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
  category TEXT,
  sales BIGINT,
  revenue NUMERIC,
  percent NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_grand_total NUMERIC;
BEGIN
  -- get total revenue first to calculate percent
  SELECT COALESCE(SUM(oi.quantity * oi.price), 0) INTO v_grand_total
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date;

  RETURN QUERY
  SELECT 
    COALESCE(p.category, 'Uncategorized') as category,
    SUM(oi.quantity)::BIGINT as sales,
    SUM(oi.quantity * oi.price)::NUMERIC as revenue,
    CASE 
      WHEN v_grand_total > 0 THEN ROUND((SUM(oi.quantity * oi.price) / v_grand_total) * 100, 2)
      ELSE 0
    END as percent
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  LEFT JOIN public.products p ON oi.product_id = p.id
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY p.category
  ORDER BY revenue DESC;
END;
$$;

-- 3. Get Sales Overview (Daily/Weekly) Fast Aggregation
CREATE OR REPLACE FUNCTION get_sales_overview_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_trunc_interval TEXT)
RETURNS TABLE (
  period TEXT,
  orders BIGINT,
  revenue NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC(p_trunc_interval, o.created_at), 
      CASE 
        WHEN p_trunc_interval = 'hour' THEN 'YYYY-MM-DD HH24:00'
        ELSE 'YYYY-MM-DD'
      END
    ) as period,
    COUNT(*)::BIGINT as orders,
    COALESCE(SUM(o.total), 0)::NUMERIC as revenue
  FROM public.orders o
  WHERE o.status != 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;
