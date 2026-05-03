import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient } from '@/lib/supabase/admin';
import { formatOrderNumber } from '@/lib/utils/formatting';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabaseAdmin = getClient();

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select('id, status, total, items, payment_method, payment_status, paid_at, created_at, updated_at, user_id, shipping_address_id, courier_id, courier_name:profiles!courier_id(name), courier_deliveries(status, rejection_reason)')
      .order('created_at', { ascending: false});

    // Apply filters
    if (status !== 'all' && status !== 'incomplete' && status !== 'rejected') {
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
    let profilesMap: Record<string, { name: string | null; deleted_at: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, deleted_at')
        .in('id', userIds);

      if (profilesError) {
        console.error('Failed to fetch profiles', profilesError);
      } else {
        profilesMap = (profiles || []).reduce((acc: any, profile: any) => {
          acc[profile.id] = { name: profile.name, deleted_at: profile.deleted_at || null };
          return acc;
        }, {} as Record<string, { name: string | null; deleted_at: string | null }>);
      }
    }

    // Fetch emails from auth.users using admin client
    let emailsMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      try {
        let authPage = 1;
        while (true) {
          const { data: { users: pageUsers }, error: usersError } =
            await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
          if (usersError) {
            console.error('Failed to fetch user emails', usersError);
            break;
          }
          if (!pageUsers || pageUsers.length === 0) break;
          pageUsers.forEach((u) => {
            if (userIds.includes(u.id)) emailsMap[u.id] = u.email || null;
          });
          if (pageUsers.length < 1000) break;
          authPage++;
        }
      } catch (err) {
        console.error('Error fetching user emails:', err);
      }
    }

    // Build a global sequence map: order id → sequential position (1-based, oldest first)
    const { data: allOrderIds } = await supabaseAdmin
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    const sequenceMap = new Map<string, number>();
    (allOrderIds || []).forEach((row: { id: string }, idx: number) => {
      sequenceMap.set(row.id, idx + 1);
    });

    // Map the data to match the expected format
    const orders = (ordersData || [])
      .map((row: any) => {
        // Parse items JSONB to count items
        const items = Array.isArray(row.items) ? row.items : [];
        const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        
        // Get customer info from profiles map and emails map
        const profile = row.user_id ? profilesMap[row.user_id] : null;
        const baseCustomerName = profile?.name || 'Guest';
        const customerName = profile?.deleted_at
          ? `${baseCustomerName} (Deleted Account)`
          : baseCustomerName;
        const customerEmail = row.user_id ? (emailsMap[row.user_id] || '') : '';
        
        // Use payment_status from database instead of calculating it
        const paymentStatus = row.payment_status || 'pending';
        
        // Format order ID
        const orderId = formatOrderNumber(sequenceMap.get(row.id) || 0);
        
        // Preserve full ISO timestamp — formatting is done on the client
        const date = row.created_at;
        
        // Format amount
        const amount = `₱${Number(row.total).toFixed(2)}`;
        
        return {
          id: orderId,
          orderId: row.id, // Keep full ID for reference
          customer: customerName,
          email: customerEmail,
          amount,
          total: Number(row.total),
          items: itemCount,
          orderStatus: row.status,
          paymentStatus,
          date,
          courier: row.courier_name?.name || null,
          isIncomplete: !row.shipping_address_id,
          isRejected: (row.courier_deliveries as any[] || []).some(d => d.status === 'failed' && d.rejection_reason),
        };
      })
      .filter((order: any) => {
        // Apply incomplete filter if requested
        if (status === 'incomplete') {
          return order.isIncomplete;
        }
        
        // Apply rejected filter
        if (status === 'rejected') {
          return order.isRejected;
        }
        
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No order IDs provided' }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // 1. Delete assignments first
    await supabaseAdmin.from('courier_deliveries').delete().in('order_id', ids);

    // 2. Delete audit logs, history, etc.
    await supabaseAdmin.from('order_status_history').delete().in('order_id', ids);
    await supabaseAdmin.from('order_items').delete().in('order_id', ids);

    // 3. Finally delete orders
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .in('id', ids);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: `Successfully deleted ${ids.length} orders` });
  } catch (error: any) {
    console.error('Failed to bulk delete orders', error);
    return NextResponse.json({ error: error.message || 'Bulk delete failed' }, { status: 500 });
  }
}
