import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/orders/[orderId]
 * Fetch order details with status history
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId } = await context.params;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

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
      console.error('Order fetch error:', orderError);
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
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('name, phone')
        .eq('id', order.user_id)
        .single();

      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);

      customerInfo = {
        name: customerProfile?.name || 'Guest',
        email: authUser?.email || '',
        phone: customerProfile?.phone || '',
      };
    }

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
    console.error('Failed to fetch order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/orders/[orderId]
 * Update order status and related fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  console.log('========== PUT REQUEST RECEIVED ==========');
  
  try {
    // Resolve params FIRST before anything else
    const { orderId } = await params;
    console.log('[PUT] Order ID resolved:', orderId);

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    console.log('[PUT] Has token:', !!token);

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    console.log('[PUT] User authenticated:', !!user, 'Error:', userError?.message);

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid token',
        details: userError?.message 
      }, { status: 401 });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('[PUT] Profile role:', profile?.role, 'Error:', profileError?.message);

    if (profileError) {
      return NextResponse.json({ 
        error: 'Unable to verify user role',
        details: profileError.message 
      }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('[PUT] Failed to parse JSON body:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status, tracking_number, courier, notes } = body;
    
    console.log('[PUT] Update data:', { status, tracking_number, courier, notes });

    // Validate status
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'duplicate'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status: ${status}`,
        validStatuses 
      }, { status: 400 });
    }

    // Fetch current order
    const { data: currentOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, paid_at, shipped_at, delivered_at')
      .eq('id', orderId)
      .maybeSingle();

    console.log('[PUT] Current order:', currentOrder, 'Error:', orderError?.message);

    if (orderError) {
      return NextResponse.json({ 
        error: 'Failed to fetch order',
        details: orderError.message 
      }, { status: 500 });
    }

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = currentOrder.status;

    if (currentStatus === status) {
      return NextResponse.json({ 
        error: 'Status is already set to this value',
        currentStatus 
      }, { status: 400 });
    }

    // Validate tracking info for shipped status
    if (status === 'shipped') {
      const trimmedTracking = tracking_number?.trim();
      const trimmedCourier = courier?.trim();
      
      if (!trimmedTracking || trimmedTracking.length < 3) {
        return NextResponse.json({ 
          error: 'Tracking number is required for shipped status (minimum 3 characters)' 
        }, { status: 400 });
      }
      if (!trimmedCourier || trimmedCourier.length === 0) {
        return NextResponse.json({ 
          error: 'Courier is required for shipped status' 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'paid' && !currentOrder.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }
    
    if (status === 'shipped') {
      if (!currentOrder.shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }
      updateData.tracking_number = tracking_number?.trim() || null;
      updateData.courier = courier?.trim() || null;
    }
    
    if (status === 'delivered' && !currentOrder.delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    }

    console.log('[PUT] Updating order with data:', updateData);

    // Update order
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    console.log('[PUT] Update result:', !!updatedOrder, 'Error:', updateError?.message);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update order',
        details: updateError.message 
      }, { status: 500 });
    }

    // Log status history (non-critical)
    try {
      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: currentStatus,
          new_status: status,
          changed_by: user.id,
          notes: notes?.trim() || null,
          tracking_number: status === 'shipped' ? tracking_number?.trim() : null,
          courier: status === 'shipped' ? courier?.trim() : null,
          changed_at: new Date().toISOString(),
        });
    } catch (e) {
      console.error('[PUT] Failed to log status history (non-critical):', e);
    }

    // Fetch updated order with full details
    const { data: order, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      console.error('[PUT] Failed to fetch updated order:', orderFetchError);
      return NextResponse.json({ 
        error: 'Order updated but failed to retrieve updated data',
        details: orderFetchError?.message 
      }, { status: 500 });
    }

    // Fetch status history
    const { data: statusHistory } = await supabaseAdmin
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true });

    // Build customer info
    let customerInfo = { name: 'Guest', email: '', phone: '' };
    if (order.user_id) {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('name, phone')
        .eq('id', order.user_id)
        .single();

      const { data: { user: authUser } } = await supabaseAdmin.auth.admin
        .getUserById(order.user_id)
        .catch(() => ({ data: { user: null } }));

      customerInfo = {
        name: customerProfile?.name || 'Guest',
        email: authUser?.email || '',
        phone: customerProfile?.phone || '',
      };
    }

    const items = Array.isArray(order.items) ? order.items : [];

    const responseData = {
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
    };

    console.log('[PUT] Success! Returning updated order');

    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('[PUT] CRITICAL ERROR:', error);
    console.error('[PUT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}