import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Products Report API for Exporting.
 * Filters by status, category, supplier, search term, and date range.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // 1. Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const identifier = getIdentifier(request, user.id);
    try {
      const { success, reset } = await rateLimiters.admin.limit(identifier);
      if (!success) return rateLimitResponse(reset);
    } catch (err) {
      console.error('[RateLimit] Redis unavailable, failing open:', err);
    }

    // 3. Use Admin Client (Service Role)
    const admin = getSupabaseAdmin()

    // Get filters from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supplierId = searchParams.get('supplier_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // 4. Build Query
    let query = admin
      .from('products')
      .select(`
        id, 
        name, 
        category, 
        is_active,
        created_at,
        suppliers:supplier_id (id, name),
        product_variants (
          id,
          stock,
          price,
          is_active
        )
      `);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) {
      // Ensure end date includes the full day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
    if (supplierId && supplierId !== 'all') query = query.eq('supplier_id', supplierId);
    if (category && category !== 'all') query = query.eq('category', category);
    if (status && status !== 'all') query = query.eq('is_active', status === 'active');
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      console.error('[Products Report] Database Error:', productsError)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    // 5. Process and Format Data
    let totalStock = 0;
    const formattedProducts = (products || []).map((p: any) => {
      const activeVariants = (p.product_variants || []).filter((v: any) => v.is_active);
      const productStock = activeVariants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
      totalStock += productStock;

      const prices = activeVariants.map((v: any) => v.price ?? 0).sort((a: number, b: number) => a - b);
      let priceRange = 'N/A';
      if (prices.length > 0) {
        priceRange = prices.length === 1 
          ? `₱${prices[0].toLocaleString()}` 
          : `₱${prices[0].toLocaleString()} - ₱${prices[prices.length - 1].toLocaleString()}`;
      }

      return {
        name: p.name,
        category: p.category || 'Uncategorized',
        supplier: p.suppliers?.name || 'Unknown',
        stock: productStock,
        priceRange,
        status: p.is_active ? 'active' : 'inactive'
      };
    });

    return NextResponse.json({
      summary: {
        totalProducts: formattedProducts.length,
        activeProducts: formattedProducts.filter(p => p.status === 'active').length,
        inactiveProducts: formattedProducts.filter(p => p.status === 'inactive').length,
        totalStock: totalStock
      },
      products: formattedProducts
    });

  } catch (error) {
    console.error('Failed to generate products report', error)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
