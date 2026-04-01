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

    // Search active products by name, description, category, and variant SKU
    const { data, error } = await adminClient
      .from('products')
      .select(`
        id, 
        name, 
        description, 
        category, 
        image_url, 
        price,
        rating,
        review_count,
        product_variants!inner(sku)
      `)
      .eq('is_active', true)
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm},product_variants.sku.ilike.${searchTerm}`)
      .limit(8);

    if (error) throw error;

    const products = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      images: row.image_url ? [row.image_url] : [],
      price: Number(row.price) || 0,
      rating: row.rating ?? 0,
      reviewCount: row.review_count ?? 0,
      sku: row.product_variants?.[0]?.sku || '',
    }));

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('[storefront-search] API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
