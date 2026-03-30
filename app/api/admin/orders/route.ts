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
      console.error('Failed to load profile for orders', profileError);
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select('id, status, total, items, payment_method, payment_status, paid_at, created_at, updated_at, user_id, courier_id, courier_name:profiles!courier_id(name)')
      .order('created_at', { ascending: false});

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: ordersData, error } = await query;

    if (error) {
      console.error('Failed to fetch orders', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique user IDs
    const userIds = Array.from(
      new Set((ordersData || []).map((order: any) => order.user_id).filter(Boolean))
    ) as string[];

    // Fetch profiles for all users (name only, email is in auth.users)
    let profilesMap: Record<string, { name: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Failed to fetch profiles', profilesError);
      } else {
        profilesMap = (profiles || []).reduce((acc, profile: any) => {
          acc[profile.id] = { name: profile.name };
          return acc;
        }, {} as Record<string, { name: string | null }>);
      }
    }

    // Fetch emails from auth.users using admin client
    let emailsMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      try {
        // Use admin client to list users and get their emails
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

    // Map the data to match the expected format
    const orders = (ordersData || [])
      .map((row: any) => {
        // Parse items JSONB to count items
        const items = Array.isArray(row.items) ? row.items : [];
        const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        
        // Get customer info from profiles map and emails map
        const profile = row.user_id ? profilesMap[row.user_id] : null;
        const customerName = profile?.name || 'Guest';
        const customerEmail = row.user_id ? (emailsMap[row.user_id] || '') : '';
        
        // Use payment_status from database instead of calculating it
        const paymentStatus = row.payment_status || 'pending';
        
        // Format order ID
        const orderId = `#${row.id.slice(0, 8).toUpperCase()}`;
        
        // Format date
        const date = new Date(row.created_at).toISOString().split('T')[0];
        
        // Format amount
        const amount = `₱${Number(row.total).toFixed(2)}`;
        
        return {
          id: orderId,
          orderId: row.id, // Keep full ID for reference
          customer: customerName,
          email: customerEmail,
          amount,
          items: itemCount,
          orderStatus: row.status,
          paymentStatus,
          date,
          courier: row.courier_name?.name || null,
        };
      })
      .filter((order: any) => {
        // Apply search filter
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          order.id.toLowerCase().includes(searchLower) ||
          order.customer.toLowerCase().includes(searchLower) ||
          order.email.toLowerCase().includes(searchLower)
        );
      });

    const totalCount = orders.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedOrders = orders.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ 
      data: paginatedOrders, 
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Failed to load orders', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

