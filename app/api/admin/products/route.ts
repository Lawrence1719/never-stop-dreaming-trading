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
    const isArchived = searchParams.get('archived') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

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
        ),
        suppliers (
          id,
          name
        )
        `
      );

    if (isArchived) {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    query = query.order('created_at', { ascending: false });

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

    // Building a separate query just for the exact count of filtered results
    let countQuery = supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true });

    if (isArchived) countQuery = countQuery.not('deleted_at', 'is', null);
    else countQuery = countQuery.is('deleted_at', null);

    if (search) countQuery = countQuery.or(`name.ilike.%${search}%`);
    if (status !== 'all') countQuery = countQuery.eq('is_active', status === 'active');
    if (category !== 'all') countQuery = countQuery.eq('category', category);

    const { count: totalFiltered } = await countQuery;

    // Apply pagination to the main data fetch
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: rawData, error } = await query;

    if (error) {
      console.error('Failed to fetch products', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get separate counts for badges
    const { count: activeCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);
    
    const { count: archivedCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    // Transform the data for the admin UI
    const products = (rawData || []).map((row: any) => {
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
        image_url: row.product_images && row.product_images.length > 0
          ? row.product_images
              .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              .find((img: any) => img.is_primary || true)
              ?.storage_path.startsWith('http')
                ? row.product_images.find((img: any) => img.is_primary || true)?.storage_path
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${row.product_images.find((img: any) => img.is_primary || true)?.storage_path}`
          : row.image_url,
        variant_names: variants.map((v: any) => v.variant_label),
        deleted_at: row.deleted_at,
        supplier_name: row.suppliers?.name || '—',
      };
    });

    return NextResponse.json({ 
      data: products,
      meta: {
        activeCount: activeCount || 0,
        archivedCount: archivedCount || 0,
        totalFiltered: totalFiltered || 0,
        page,
        limit,
        totalPages: Math.ceil((totalFiltered || 0) / limit)
      }
    });

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
          supplier_id: body.supplier_id || null,
          item_code: body.item_code || null,
          unit: body.unit || null,
          doz_pckg: body.doz_pckg || null,
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

    // Handle default variant creation if SKU/Price/Stock provided
    if (body.sku || body.price !== undefined || body.stock !== undefined) {
      const { error: variantError } = await supabaseAdmin
        .from('product_variants')
        .insert([
          {
            product_id: data.id,
            variant_label: 'Standard', // Default label
            sku: body.sku || `NSD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            price: Number(body.price) || 0,
            stock: Number(body.stock) || 0,
            reorder_threshold: 10, // Default reorder threshold
            is_active: true,
          },
        ]);

      if (variantError) {
        console.error('Failed to create default variant', variantError);
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
