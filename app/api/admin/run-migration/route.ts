import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';

// ONE-TIME use route — run this once then delete it.
// Visit /api/admin/run-migration to apply the updated RPCs.
export async function GET(request: NextRequest) {
  const identifier = getIdentifier(request);
  try {
    const { success, reset } = await rateLimiters.expensive.limit(identifier);
    if (!success) return rateLimitResponse(reset);
  } catch (err) {
    console.error('[RateLimit] Redis unavailable, failing open:', err);
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const sqlParts = [
    // Part 1: get_sales_by_category_rpc
    `CREATE OR REPLACE FUNCTION get_sales_by_category_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
  category TEXT,
  sales BIGINT,
  revenue NUMERIC,
  percent NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
  v_grand_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(combined.line_revenue), 0) INTO v_grand_total
  FROM (
    SELECT (oi.quantity * oi.price) AS line_revenue
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND oi.product_id IS NOT NULL
    UNION ALL
    SELECT ((item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC) AS line_revenue
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.status != 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_id = o.id)
      AND (item->>'price') IS NOT NULL
      AND (item->>'quantity') IS NOT NULL
  ) AS combined;

  RETURN QUERY
  WITH combined_items AS (
    SELECT
      COALESCE(p.category, 'Uncategorized') AS category,
      oi.quantity,
      oi.quantity * oi.price AS line_revenue
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    LEFT JOIN public.products p ON oi.product_id = p.id
    WHERE o.status != 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND oi.product_id IS NOT NULL
    UNION ALL
    SELECT
      COALESCE(
        (SELECT p2.category FROM public.products p2 WHERE p2.id = (item->>'product_id')::UUID LIMIT 1),
        'Uncategorized'
      ) AS category,
      (item->>'quantity')::INTEGER AS quantity,
      ((item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC) AS line_revenue
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.status != 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_id = o.id)
      AND (item->>'price') IS NOT NULL
      AND (item->>'quantity') IS NOT NULL
  )
  SELECT
    ci.category,
    SUM(ci.quantity)::BIGINT AS sales,
    SUM(ci.line_revenue)::NUMERIC AS revenue,
    CASE
      WHEN v_grand_total > 0 THEN ROUND((SUM(ci.line_revenue) / v_grand_total) * 100, 2)
      ELSE 0
    END AS percent
  FROM combined_items ci
  GROUP BY ci.category
  ORDER BY revenue DESC;
END;
$func$`,

    // Part 2: get_top_products_rpc
    `CREATE OR REPLACE FUNCTION get_top_products_rpc(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  name TEXT,
  sold BIGINT,
  revenue NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  RETURN QUERY
  WITH combined_items AS (
    SELECT
      COALESCE(p.name, 'Unknown Product') AS product_name,
      oi.quantity,
      oi.quantity * oi.price AS line_revenue
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    LEFT JOIN public.products p ON oi.product_id = p.id
    WHERE o.status != 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND oi.product_id IS NOT NULL
    UNION ALL
    SELECT
      COALESCE(
        (SELECT p2.name FROM public.products p2 WHERE p2.id = (item->>'product_id')::UUID LIMIT 1),
        COALESCE(item->>'name', 'Unknown Product')
      ) AS product_name,
      (item->>'quantity')::INTEGER AS quantity,
      ((item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC) AS line_revenue
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.status != 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_id = o.id)
      AND (item->>'price') IS NOT NULL
      AND (item->>'quantity') IS NOT NULL
  )
  SELECT
    ci.product_name AS name,
    SUM(ci.quantity)::BIGINT AS sold,
    SUM(ci.line_revenue)::NUMERIC AS revenue
  FROM combined_items ci
  GROUP BY ci.product_name
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$func$`,
  ];

  const results: Array<{ part: number; status: string; error?: string }> = [];

  for (const [i, sql] of sqlParts.entries()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      // The above won't work — Supabase JS client doesn't expose raw SQL.
      // Use the pg-meta endpoint instead:
      const pgMetaRes = await fetch(
        `${supabaseUrl.replace('.supabase.co', '')}/pg/query`.replace('https://', 'https://api.supabase.com/v1/projects/xmxulohofsbtzcfphzfk/database/'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: sql }),
        }
      );
      results.push({ part: i + 1, status: `res:${res.status} pgmeta:${pgMetaRes.status}` });
    } catch (e: any) {
      results.push({ part: i + 1, status: 'error', error: e.message });
    }
  }

  return NextResponse.json({
    message: 'Cannot run raw SQL via Supabase JS client. Please apply the SQL in Supabase SQL Editor.',
    instructions: 'Go to https://supabase.com/dashboard/project/xmxulohofsbtzcfphzfk/sql/new and paste the SQL from the file below.',
    sqlFile: '/supabase/migrations/056_fix_reporting_rpcs_jsonb_fallback.sql',
    results,
  });
}
