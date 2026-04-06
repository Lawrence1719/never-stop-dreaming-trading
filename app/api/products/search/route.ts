import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const adminClient = getClient();
    const searchTerm = `%${q}%`;

    // Search active products by name, description, and category
    const { data, error } = await adminClient
      .from('products')
      .select(`
        id, 
        name, 
        description, 
        category, 
        image_url, 
        rating,
        review_count,
        product_variants(price, sku, is_active)
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`);

    if (error) {
      console.error('[storefront-search] Supabase Error:', error);
      throw error;
    }

    const products = (data || []).map((row: any) => {
      const activeVariants = (row.product_variants || []).filter((v: any) => v.is_active);
      const prices = activeVariants.map((v: any) => Number(v.price)).filter((p: number) => !isNaN(p));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        category: row.category || '',
        images: row.image_url ? [row.image_url] : [],
        price: minPrice,
        rating: row.rating ?? 0,
        reviewCount: row.review_count ?? 0,
        sku: activeVariants[0]?.sku || '',
      };
    });

    return NextResponse.json({ data: products });
  } catch (error: any) {
    console.error('[storefront-search] API Error Catch:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message,
      details: error.details || error.hint || ''
    }, { status: 500 });
  }
}
