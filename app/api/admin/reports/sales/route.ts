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

    // Fetch top products (filtered by date range)
    const { start, end } = getDateRange(range);
    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('items, total, created_at')
      .neq('status', 'cancelled')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    // Calculate product sales
    const productSales: Record<string, { sold: number; revenue: number; name: string }> = {};
    (ordersData || []).forEach((order: any) => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((item: any) => {
        const productId = item.product_id || item.id || 'unknown';
        const productName = item.name || 'Unknown Product';
        const quantity = item.quantity || 1;
        const price = Number(item.price || 0);

        if (!productSales[productId]) {
          productSales[productId] = { sold: 0, revenue: 0, name: productName };
        }
        productSales[productId].sold += quantity;
        productSales[productId].revenue += price * quantity;
      });
    });

    // Get top products
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((product) => ({
        name: product.name,
        sold: product.sold,
        revenue: `₱${product.revenue.toFixed(2)}`,
      }));

    // Calculate sales count by category from orders
    const categorySales: Record<string, number> = {};
    (ordersData || []).forEach((order: any) => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((item: any) => {
        const category = item.category || 'Uncategorized';
        const quantity = item.quantity || 1;
        categorySales[category] = (categorySales[category] || 0) + quantity;
      });
    });

    // Format sales by category for chart
    const salesByCategoryChart = salesByCategory.breakdown.map((cat) => ({
      category: cat.category || 'Uncategorized',
      sales: categorySales[cat.category || 'Uncategorized'] || 0,
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

