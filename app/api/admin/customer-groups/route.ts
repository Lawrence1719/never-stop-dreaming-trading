import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to load profile for customer groups', profileError);
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all customers and their order data
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, created_at')
      .eq('role', 'customer');

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('user_id, total, created_at');

    // Calculate customer statistics
    const customerStats: Record<string, { totalSpent: number; orderCount: number; lastOrderDate: string | null }> = {};
    
    (orders || []).forEach((order: any) => {
      if (!order.user_id) return;
      if (!customerStats[order.user_id]) {
        customerStats[order.user_id] = { totalSpent: 0, orderCount: 0, lastOrderDate: null };
      }
      customerStats[order.user_id].totalSpent += Number(order.total || 0);
      customerStats[order.user_id].orderCount += 1;
      const orderDate = new Date(order.created_at);
      if (!customerStats[order.user_id].lastOrderDate || orderDate > new Date(customerStats[order.user_id].lastOrderDate)) {
        customerStats[order.user_id].lastOrderDate = order.created_at;
      }
    });

    // Calculate groups
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const vipCustomers: string[] = [];
    const regularCustomers: string[] = [];
    const newCustomers: string[] = [];
    const inactiveCustomers: string[] = [];

    (profiles || []).forEach((profile: any) => {
      const stats = customerStats[profile.id] || { totalSpent: 0, orderCount: 0, lastOrderDate: null };
      const joinDate = new Date(profile.created_at);
      const lastOrderDate = stats.lastOrderDate ? new Date(stats.lastOrderDate) : null;

      // VIP: High-value customers (spent > $500)
      if (stats.totalSpent > 500) {
        vipCustomers.push(profile.id);
      }
      // Regular: Active customers with orders
      else if (stats.orderCount > 0) {
        regularCustomers.push(profile.id);
      }
      // New: Recently joined (within 30 days)
      if (joinDate > thirtyDaysAgo) {
        newCustomers.push(profile.id);
      }
      // Inactive: No orders in 90 days
      if (!lastOrderDate || lastOrderDate < ninetyDaysAgo) {
        inactiveCustomers.push(profile.id);
      }
    });

    // Build groups
    const groups = [
      {
        id: 'vip',
        name: 'VIP',
        description: 'High-value customers',
        customers: vipCustomers.length,
        discount: '15%',
        status: 'active',
      },
      {
        id: 'regular',
        name: 'Regular',
        description: 'Active customers',
        customers: regularCustomers.length,
        discount: '5%',
        status: 'active',
      },
      {
        id: 'new',
        name: 'New',
        description: 'Recently joined',
        customers: newCustomers.length,
        discount: '10%',
        status: 'active',
      },
      {
        id: 'inactive',
        name: 'Inactive',
        description: 'No orders in 90 days',
        customers: inactiveCustomers.length,
        discount: '0%',
        status: inactiveCustomers.length > 0 ? 'active' : 'inactive',
      },
    ];

    return NextResponse.json({ data: groups });
  } catch (error) {
    console.error('Failed to load customer groups', error);
    return NextResponse.json({ error: 'Failed to load customer groups' }, { status: 500 });
  }
}

