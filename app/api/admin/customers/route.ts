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
      console.error('Failed to load profile for customers', profileError);
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Fetch all profiles
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('id, name, phone, role, created_at')
      .order('created_at', { ascending: false });

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('Failed to fetch profiles', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get all user IDs
    const userIds = (profiles || []).map((p: any) => p.id);

    // Fetch emails from auth.users
    let emailsMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      try {
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) {
          console.error('Failed to fetch user emails', usersError);
        } else {
          emailsMap = (users || []).reduce((acc, user) => {
            if (userIds.includes(user.id)) {
              acc[user.id] = user.email || null;
            }
            return acc;
          }, {} as Record<string, string | null>);
        }
      } catch (err) {
        console.error('Error fetching user emails:', err);
      }
    }

    // Fetch order statistics for each customer
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('user_id, total, status');

    if (ordersError) {
      console.error('Failed to fetch orders for customer stats', ordersError);
    }

    // Calculate order stats per customer
    const orderStats: Record<string, { count: number; total: number }> = {};
    (ordersData || []).forEach((order: any) => {
      if (!order.user_id) return;
      if (!orderStats[order.user_id]) {
        orderStats[order.user_id] = { count: 0, total: 0 };
      }
      orderStats[order.user_id].count += 1;
      orderStats[order.user_id].total += Number(order.total || 0);
    });

    // Get blocked status for all users at once
    const blockedUsers = new Set<string>();
    try {
      const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
      (allUsers || []).forEach((user) => {
        if (user.user_metadata?.blocked === true && userIds.includes(user.id)) {
          blockedUsers.add(user.id);
        }
      });
    } catch (err) {
      console.error('Error checking blocked users:', err);
    }

    // Map the data to match the expected format
    const customers = (profiles || [])
      .map((profile: any) => {
        const stats = orderStats[profile.id] || { count: 0, total: 0 };
        const email = emailsMap[profile.id] || '';
        
        // Determine status from blocked users set
        const customerStatus = blockedUsers.has(profile.id) ? 'blocked' : 'active';
        
        // Format join date
        const joinDate = new Date(profile.created_at).toISOString().split('T')[0];
        
        // Format total spent
        const totalSpent = `₱${stats.total.toFixed(2)}`;
        
        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email,
          phone: profile.phone || '-',
          orders: stats.count,
          totalSpent,
          status: customerStatus,
          joinDate,
        };
      })
      .filter((customer: any) => {
        // Apply search filter
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower)
        );
      })
      .filter((customer: any) => {
        // Apply status filter
        if (status === 'all') return true;
        return customer.status === status;
      });

    return NextResponse.json({ data: customers });
  } catch (error) {
    console.error('Failed to load customers', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

