import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure this API route is always hit dynamically and never cached by Next.js edge/server caches
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const apiKey = supabaseServiceKey || supabaseAnonKey;

  if (!supabaseUrl || !apiKey) {
    return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, apiKey);

  try {
    // Fetch products with their variants
    // Only include active variants for public consumption
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        category,
        image_url,
        is_active,
        deleted_at,
        created_at,
        updated_at,
        specifications,
        iot,
        rating,
        review_count,
        featured,
        compare_at_price,
        product_variants (
          id,
          product_id,
          variant_label,
          price,
          stock,
          sku,
          reorder_threshold,
          is_active
        )
        `
      )
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: reviewRows, error: reviewsError } = await supabase
      .from('reviews')
      .select('product_id, rating')
      .eq('status', 'approved');

    if (reviewsError) {
      console.error('public/products: reviews aggregate query failed:', reviewsError.message);
    }

    const reviewStats = new Map<string, { sum: number; count: number }>();
    for (const row of reviewRows || []) {
      const pid = row.product_id as string;
      const prev = reviewStats.get(pid) ?? { sum: 0, count: 0 };
      prev.sum += Number(row.rating) || 0;
      prev.count += 1;
      reviewStats.set(pid, prev);
    }

    // Transform the data to include computed fields
    const transformedData = (data || []).map((product: any) => {
      const variants = (product.product_variants || []).filter((v: any) => v.is_active);
      const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
      const prices = variants.map((v: any) => Number(v.price)).sort((a: number, b: number) => a - b);
      const minPrice = prices.length > 0 ? prices[0] : null;
      const maxPrice = prices.length > 0 ? prices[prices.length - 1] : null;

      const agg = reviewStats.get(product.id);
      const reviewCount =
        agg && agg.count > 0 ? agg.count : Number(product.review_count) || 0;
      const rating =
        agg && agg.count > 0
          ? agg.sum / agg.count
          : Number(product.rating) || 0;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug || product.id,
        description: product.description || '',
        category: product.category || '',
        images: product.image_url ? [product.image_url] : [],
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
        rating,
        review_count: reviewCount,
        featured: Boolean(product.featured),
        compare_at_price: product.compare_at_price ?? null,
        specifications: product.specifications || {},
        iot: product.iot,
        // Variants data
        variants: variants,
        // Computed fields
        totalStock,
        minPrice,
        maxPrice,
        // For backwards compatibility with single-price products
        price: minPrice || 0,
        stock: totalStock,
      };
    });

    return NextResponse.json({ data: transformedData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
