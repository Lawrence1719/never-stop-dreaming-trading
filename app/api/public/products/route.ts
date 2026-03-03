import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure this API route is always hit dynamically and never cached by Next.js edge/server caches
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase service credentials not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        created_at,
        updated_at,
        specifications,
        iot,
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
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include computed fields
    const transformedData = (data || []).map((product: any) => {
      const variants = (product.product_variants || []).filter((v: any) => v.is_active);
      const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
      const prices = variants.map((v: any) => Number(v.price)).sort((a: number, b: number) => a - b);
      const minPrice = prices.length > 0 ? prices[0] : null;
      const maxPrice = prices.length > 0 ? prices[prices.length - 1] : null;

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
        rating: 0,
        reviewCount: 0,
        featured: false,
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
