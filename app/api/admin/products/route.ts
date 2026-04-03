import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils/formatting';

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

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';

    // Build query to fetch products (base info only, no price/stock at product level)
    let query = supabaseAdmin
      .from('products')
      .select(
        `
        id,
        name,
        description,
        category,
        image_url,
        is_active,
        deleted_at,
        created_at,
        updated_at,
        product_variants (
          id,
          variant_label,
          price,
          stock,
          sku,
          reorder_threshold,
          is_active
        ),
        product_images (
          id,
          storage_path,
          sort_order,
          is_primary
        )
        `
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%`);
    }

    if (status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch products', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data for the admin UI
    const products = (data || []).map((row: any) => {
      const variants = row.product_variants || [];
      const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
      const activeVariants = variants.filter((v: any) => v.is_active);
      const prices = activeVariants
        .map((v: any) => Number(v.price))
        .sort((a: number, b: number) => a - b);
      
      const minPrice = prices.length > 0 ? prices[0] : null;
      const maxPrice = prices.length > 0 ? prices[prices.length - 1] : null;

      return {
        id: row.id,
        name: row.name,
        category: row.category || '',
        variant_count: variants.length,
        total_stock: totalStock,
        price_range: minPrice !== null && maxPrice !== null 
          ? minPrice === maxPrice 
            ? formatPrice(minPrice)
            : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
          : 'N/A',
        status: row.is_active ? 'active' : 'inactive',
        image_url: row.image_url,
        variant_names: variants.map((v: any) => v.variant_label),
      };
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('Failed to load products', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

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

    // Validate required fields (only product base info)
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Create product WITHOUT price, stock, or SKU (those go in variants)
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          name: body.name,
          description: body.description || '',
          category: body.category || '',
          image_url: body.image_url || null,
          is_active: body.is_active !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create product', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle product images if provided
    if (body.product_images && Array.isArray(body.product_images) && body.product_images.length > 0) {
      const imagesToInsert = body.product_images.map((img: any, index: number) => ({
        product_id: data.id,
        storage_path: img.storage_path,
        sort_order: img.sort_order ?? index,
        is_primary: img.is_primary || false,
      }));

      const { error: imagesError } = await supabaseAdmin
        .from('product_images')
        .insert(imagesToInsert);

      if (imagesError) {
        console.error('Failed to insert product images', imagesError);
        // We don't fail the whole request, but log it
      }
    }

    // Trigger notification for admins
    try {
      const { notifyNewProduct } = await import('@/lib/notifications/service');
      await notifyNewProduct(body.name, data.id);
    } catch (notifErr) {
      console.error('Failed to trigger product notification:', notifErr);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
