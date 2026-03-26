import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    const supabaseAdmin = getClient();
    let query = supabaseAdmin
      .from('cms_testimonials')
      .select('name, rating, comment, date, product:products(name)')
      .eq('status', 'published')
      .order('date', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch public CMS testimonials', error);
      return NextResponse.json({ error: 'Failed to load public CMS testimonials' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to load public CMS testimonials', error);
    return NextResponse.json({ error: 'Failed to load public CMS testimonials' }, { status: 500 });
  }
}
