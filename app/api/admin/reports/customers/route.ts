import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = getClient()

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Fetch all customers (profiles with role 'customer')
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('id, name, created_at, deleted_at')
      .eq('role', 'customer');
    
    if (startDate) profileQuery = profileQuery.gte('created_at', startDate);
    if (endDate) profileQuery = profileQuery.lte('created_at', endDate);

    const { data: profiles } = await profileQuery;

    // Fetch all orders
    let orderQuery = supabaseAdmin
      .from('orders')
      .select('user_id, total, created_at, items');
    
    if (startDate) orderQuery = orderQuery.gte('created_at', startDate);
    if (endDate) orderQuery = orderQuery.lte('created_at', endDate);

    const { data: orders } = await orderQuery;

    // Get user emails
    const userIds = (profiles || []).map((p: any) => p.id);
    let emailsMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        let authPage = 1;
        while (true) {
          const { data: { users: pageUsers }, error } =
            await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
          if (error || !pageUsers || pageUsers.length === 0) break;
          pageUsers.forEach((u) => {
            if (userIds.includes(u.id) && u.email) emailsMap[u.id] = u.email;
          });
          if (pageUsers.length < 1000) break;
          authPage++;
        }
      } catch (err) {
        console.error('Error fetching emails:', err);
      }
    }

    // Calculate customer statistics
    const customerStats: Record<string, {
      orders: number;
      totalSpent: number;
      avgOrderValue: number;
    }> = {};

    (orders || []).forEach((order: any) => {
      if (!order.user_id) return;
      if (!customerStats[order.user_id]) {
        customerStats[order.user_id] = { orders: 0, totalSpent: 0, avgOrderValue: 0 };
      }
      customerStats[order.user_id].orders += 1;
      customerStats[order.user_id].totalSpent += Number(order.total || 0);
    });

    // Calculate averages
    Object.keys(customerStats).forEach((userId) => {
      const stats = customerStats[userId];
      stats.avgOrderValue = stats.orders > 0 ? stats.totalSpent / stats.orders : 0;
    });

    // Get top customers
    const topCustomers = (profiles || [])
      .map((profile: any) => {
        const stats = customerStats[profile.id] || { orders: 0, totalSpent: 0, avgOrderValue: 0 };
        const displayName = profile.deleted_at
          ? `${profile.name || 'Unknown'} (Deleted Account)`
          : profile.name || 'Unknown';
        return {
          id: profile.id,
          name: displayName,
          email: emailsMap[profile.id] || '',
          orders: stats.orders,
          totalSpent: stats.totalSpent,
          status: stats.totalSpent > 500 ? 'VIP' : 'Regular',
        };
      })
      .filter((c) => c.orders > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        email: c.email,
        orders: c.orders,
        totalSpent: `₱${c.totalSpent.toFixed(2)}`,
        status: c.status,
      }));

    // Calculate segments
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    let vipCount = 0;
    let vipRevenue = 0;
    let vipAvgOrder = 0;
    let regularCount = 0;
    let regularRevenue = 0;
    let regularAvgOrder = 0;
    let newCount = 0;
    let newRevenue = 0;
    let newAvgOrder = 0;

    (profiles || []).forEach((profile: any) => {
      const stats = customerStats[profile.id] || { orders: 0, totalSpent: 0, avgOrderValue: 0 };
      const joinDate = new Date(profile.created_at);

      if (stats.totalSpent > 500) {
        vipCount++;
        vipRevenue += stats.totalSpent;
        vipAvgOrder += stats.avgOrderValue;
      } else if (stats.orders > 0) {
        regularCount++;
        regularRevenue += stats.totalSpent;
        regularAvgOrder += stats.avgOrderValue;
      }

      if (joinDate > thirtyDaysAgo) {
        newCount++;
        newRevenue += stats.totalSpent;
        newAvgOrder += stats.avgOrderValue;
      }
    });

    const customerSegments = [
      {
        segment: 'VIP Customers',
        count: vipCount,
        avgOrderValue: vipCount > 0 ? `₱${(vipAvgOrder / vipCount).toFixed(2)}` : '₱0.00',
        totalRevenue: `₱${vipRevenue.toFixed(2)}`,
      },
      {
        segment: 'Regular Customers',
        count: regularCount,
        avgOrderValue: regularCount > 0 ? `₱${(regularAvgOrder / regularCount).toFixed(2)}` : '₱0.00',
        totalRevenue: `₱${regularRevenue.toFixed(2)}`,
      },
      {
        segment: 'New Customers',
        count: newCount,
        avgOrderValue: newCount > 0 ? `₱${(newAvgOrder / newCount).toFixed(2)}` : '₱0.00',
        totalRevenue: `₱${newRevenue.toFixed(2)}`,
      },
    ];

    // Calculate summary stats
    const totalCustomers = (profiles || []).length;
    const activeCustomers = Object.keys(customerStats).length;
    const allOrders = (orders || []).filter((o: any) => o.user_id);
    const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
    const avgLifetimeValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    return NextResponse.json({
      summary: {
        totalCustomers,
        activeCustomers,
        avgOrderValue,
        customerLifetimeValue: avgLifetimeValue,
      },
      topCustomers,
      customerSegments,
    });
  } catch (error) {
    console.error('Failed to load customer report', error);
    return NextResponse.json({ error: 'Failed to load customer report' }, { status: 500 });
  }
}
