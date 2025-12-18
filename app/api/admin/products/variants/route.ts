import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

async function verifyAdminAuth(token: string | null) {
  if (!token) {
    return { error: 'Unauthorized', status: 401, user: null };
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return { error: 'Unauthorized', status: 401, user: null };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return { error: 'Forbidden', status: 403, user: null };
    }

    return { error: null, status: 200, user };
  } catch (err) {
    return { error: 'Unauthorized', status: 401, user: null };
  }
}

/**
 * GET /api/admin/products/variants
 * Fetch all variants, optionally filtered by product_id
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    let query = supabaseAdmin
      .from('product_variants')
      .select('*')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch variants', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch variants', error);
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products/variants
 * Create a new product variant
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const supabaseAdmin = getClient();

    // Validate required fields
    if (!body.product_id || !body.variant_label || body.price === undefined || body.stock === undefined || !body.sku) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, variant_label, price, stock, sku' },
        { status: 400 }
      );
    }

    // Check if product exists
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', body.product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check for duplicate SKU
    const { data: existingSku } = await supabaseAdmin
      .from('product_variants')
      .select('id')
      .eq('sku', body.sku)
      .single();

    if (existingSku) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    }

    // Create variant
    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .insert([
        {
          product_id: body.product_id,
          variant_label: body.variant_label,
          price: parseFloat(body.price),
          stock: parseInt(body.stock),
          sku: body.sku,
          reorder_threshold: body.reorder_threshold ?? 5,
          is_active: body.is_active !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create variant', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create variant', error);
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 });
  }
}
