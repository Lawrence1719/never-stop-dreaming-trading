import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku');
  const productId = searchParams.get('productId');

  if (!sku) {
    return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    
    // Query variant with same SKU
    let query = supabase
      .from('product_variants')
      .select('id, product_id')
      .eq('sku', sku.toUpperCase().trim());

    const { data: variants, error } = await query;

    if (error) throw error;

    // If a variant with this SKU exists...
    if (variants && variants.length > 0) {
      // If we are editing a product, we should allow the SKU if it belongs to one of its own variants
      const isSameProduct = productId ? variants.every(v => v.product_id === productId) : false;
      
      return NextResponse.json({ 
        data: { 
          exists: !isSameProduct 
        } 
      });
    }

    return NextResponse.json({ data: { exists: false } });
  } catch (err: any) {
    console.error('Error checking SKU uniqueness:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
