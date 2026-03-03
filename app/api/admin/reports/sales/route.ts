import { NextRequest, NextResponse } from 'next/server';
import {
  getClient,
  getTotalRevenue,
  getTotalOrders,
  getAverageOrderValue,
  getSalesByCategory,
  getGrowthRate,
  getDateRange,
} from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get date range from query params (default to 'month')
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as 'day' | 'week' | 'month' | 'all') || 'month';

    // Fetch sales data
    const [
      { revenue: totalRevenue },
      { orders: totalOrders },
      { averageOrderValue },
      salesByCategory,
      revenueGrowth,
      ordersGrowth,
      aovGrowth,
    ] = await Promise.all([
      getTotalRevenue(range, supabaseAdmin),
      getTotalOrders(range, supabaseAdmin),
      getAverageOrderValue(range, supabaseAdmin),
      getSalesByCategory(range, supabaseAdmin),
      getGrowthRate('revenue', range, supabaseAdmin),
      getGrowthRate('orders', range, supabaseAdmin),
      getGrowthRate('aov', range, supabaseAdmin),
    ]);

    // Fetch top products (filtered by date range) via RPC
    const { start, end } = getDateRange(range);

    // We get top 10 products directly from PostgreSQL
    const { data: topProductsData, error: topProductsError } = await supabaseAdmin.rpc('get_top_products_rpc', {
      p_start_date: start,
      p_end_date: end,
      p_limit: 10
    });

    if (topProductsError) {
      console.error('Failed to load top products from RPC', topProductsError);
    }

    const topProducts = (topProductsData || []).map((product: any) => ({
      name: product.name,
      sold: Number(product.sold),
      revenue: `₱${Number(product.revenue).toFixed(2)}`,
    }));

    // Calculate sales count by category from orders (already handled by get_sales_by_category_rpc inside getSalesByCategory)
    // The previous implementation calculated salesByCategoryChart manually here because standard getSalesByCategory didn't include counts.
    // Our updated getSalesByCategory now includes the `sales` count automatically from the RPC!
    const salesByCategoryChart = salesByCategory.breakdown.map((cat: any) => ({
      category: cat.category || 'Uncategorized',
      sales: cat.sales || 0,
      revenue: cat.revenue,
    }));

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        conversionRate: 3.24, // This would need to be calculated from analytics
        revenueGrowth: revenueGrowth.change,
        ordersGrowth: ordersGrowth.change,
        aovGrowth: aovGrowth.change,
      },
      salesByCategory: salesByCategoryChart,
      topProducts,
    });
  } catch (error) {
    console.error('Failed to load sales report', error);
    return NextResponse.json({ error: 'Failed to load sales report' }, { status: 500 });
  }
}

