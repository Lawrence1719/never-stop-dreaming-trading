import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/orders/[orderId]
 * Fetch order details with status history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId } = await params;
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
      console.error('Failed to load profile', profileError);
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch order with shipping address
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch status history
    const { data: statusHistory, error: historyError } = await supabaseAdmin
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true });

    if (historyError) {
      console.error('Failed to fetch status history', historyError);
    }

    // Get customer information
    let customerInfo = {
      name: 'Guest',
      email: '',
      phone: '',
    };

    if (order.user_id) {
      // Get profile
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('name, phone')
        .eq('id', order.user_id)
        .single();

      // Get email from auth.users
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);

      customerInfo = {
        name: customerProfile?.name || 'Guest',
        email: authUser?.email || '',
        phone: customerProfile?.phone || '',
      };
    }

    // Parse items
    const items = Array.isArray(order.items) ? order.items : [];

    return NextResponse.json({
      id: order.id,
      customer: customerInfo,
      status: order.status,
      total: Number(order.total),
      items,
      shipping_address: order.shipping_address,
      shipping_address_id: order.shipping_address_id,
      payment_method: order.payment_method,
      tracking_number: order.tracking_number,
      courier: order.courier,
      paid_at: order.paid_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
      status_history: statusHistory || [],
    });
  } catch (error) {
    console.error('Failed to fetch order', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

