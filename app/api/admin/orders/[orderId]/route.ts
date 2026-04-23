import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { sendOrderStatusEmail } from '@/lib/emails/order-emails';
import { createNotification } from '@/lib/notifications/service';
import { assignCourier } from '@/lib/courier';
import { formatOrderNumber } from '@/lib/utils/formatting';

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
        shipping_address:addresses!shipping_address_id(*),
        assigned_courier:profiles!courier_id(name)
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
        .select('name, phone, deleted_at')
        .eq('id', order.user_id)
        .single();

      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);

      customerInfo = {
        name: customerProfile?.deleted_at
          ? `${customerProfile?.name || 'Guest'} (Deleted Account)`
          : customerProfile?.name || 'Guest',
        email: authUser?.email || '',
        phone: customerProfile?.phone || '',
      };
    }

    let items = Array.isArray(order.items) ? order.items : [];

    // ENRICHMENT: Fetch images for items if missing or placeholders
    if (items.length > 0) {
      const productIds = items.map((i: any) => i.product_id || i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const { data: productsData } = await supabaseAdmin
          .from('products')
          .select('id, image_url, product_images(storage_path, is_primary)')
          .in('id', productIds);

        if (productsData) {
          items = items.map((item: any) => {
            const p = productsData.find(pd => pd.id === (item.product_id || item.productId));
            if (p) {
              const isPlaceholder = !item.image || item.image === '/placeholder.svg' || item.image === '';
              const productImages = p.product_images || [];
              const primaryImage = (productImages as any[]).find(img => img.is_primary) || productImages[0];
              const dbImage = primaryImage?.storage_path || p.image_url;

              if (isPlaceholder && dbImage) {
                return { ...item, image: dbImage };
              }
            }
            return item;
          });
        }
      }
    }

    // Calculate readable order number (#NSD-xxxxx)
    const { data: allOrderIds } = await supabaseAdmin
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    const sequenceMap = new Map<string, number>();
    (allOrderIds || []).forEach((row: { id: string }, idx: number) => {
      sequenceMap.set(row.id, idx + 1);
    });
    
    const orderNumber = formatOrderNumber(sequenceMap.get(order.id) || 0);

    return NextResponse.json({
      id: order.id,
      orderNumber,
      customer: customerInfo,
      status: order.status,
      payment_status: order.payment_status || 'pending',
      total: Number(order.total),
      items,
      shipping_address: order.shipping_address,
      shipping_address_id: order.shipping_address_id,
      payment_method: order.payment_method,
      tracking_number: order.tracking_number,
      courier: order.courier,
      assigned_courier_name: (order.assigned_courier as any)?.name || null,
      paid_at: order.paid_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      confirmed_by_customer_at: order.confirmed_by_customer_at,
      auto_confirmed: order.auto_confirmed,
      discount_amount: Number(order.discount_amount) || 0,
      shipping_cost: Number(order.shipping_cost) || 0,
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
    } = await supabaseAdmin.auth.getUser(token || undefined);

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

    const { status, tracking_number, courier, notes, courier_id: manualCourierId, isManualOverride } = body;
    
    console.log('[PUT] Update data:', { status, tracking_number, courier, notes, isManualOverride });

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

    // NEW: Handle courier assignment when shipped
    let assignedPersonnelName = null;
    if (status === 'shipped') {
      try {
        console.log('[PUT] Triggering courier assignment');
        const delivery = await assignCourier(orderId, manualCourierId);
        if (delivery && (delivery as any).courier) {
           assignedPersonnelName = (delivery as any).courier.name;
        }
      } catch (e) {
        console.error('[PUT] Courier assignment failed:', e);
      }
    }

    // Log status history (non-critical)
    try {
      let finalNotes = notes?.trim() || null;
      if (status === 'delivered' && isManualOverride) {
        finalNotes = 'Manually confirmed as delivered by admin (no courier proof uploaded)';
      } else if (status === 'shipped') {
        const personnelNote = assignedPersonnelName ? `Courier assigned: ${assignedPersonnelName}` : '';
        const baseNote = notes?.trim() ? notes.trim() : 'Package handed to courier';
        finalNotes = personnelNote ? `${baseNote}. ${personnelNote}` : baseNote;
      }

      await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: currentStatus,
          new_status: status,
          changed_by: user.id,
          notes: finalNotes,
          tracking_number: status === 'shipped' ? tracking_number?.trim() : null,
          courier: status === 'shipped' ? courier?.trim() : null,
          changed_at: new Date().toISOString(),
        });
    } catch (e) {
      console.error('[PUT] Failed to log status history (non-critical):', e);
    }

    // NEW: Handle manual override courier_deliveries table update
    if (status === 'delivered' && isManualOverride) {
      try {
        console.log('[PUT] Manual delivery override: updating courier_deliveries');
        await supabaseAdmin
          .from('courier_deliveries')
          .update({
            status: 'proof_pending',
            admin_overridden: true,
            admin_overridden_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .lt('status', 'delivered'); // Only update if not already delivered/completed
      } catch (e) {
        console.error('[PUT] Manual delivery override courier table update failed:', e);
      }
    }

    // Fetch updated order with full details
    const { data: order, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(*),
        assigned_courier:profiles!courier_id(name)
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

    let items = Array.isArray(order.items) ? order.items : [];

    // ENRICHMENT: Fetch images for items if missing or placeholders
    if (items.length > 0) {
      const productIds = items.map((i: any) => i.product_id || i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const { data: productsData } = await supabaseAdmin
          .from('products')
          .select('id, image_url, product_images(storage_path, is_primary)')
          .in('id', productIds);

        if (productsData) {
          items = items.map((item: any) => {
            const p = productsData.find(pd => pd.id === (item.product_id || item.productId));
            if (p) {
              const isPlaceholder = !item.image || item.image === '/placeholder.svg' || item.image === '';
              const productImages = p.product_images || [];
              const primaryImage = (productImages as any[]).find(img => img.is_primary) || productImages[0];
              const dbImage = primaryImage?.storage_path || p.image_url;

              if (isPlaceholder && dbImage) {
                return { ...item, image: dbImage };
              }
            }
            return item;
          });
        }
      }
    }

    // Calculate readable order number (#NSD-xxxxx)
    const { data: allOrderIds } = await supabaseAdmin
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    const sequenceMap = new Map<string, number>();
    (allOrderIds || []).forEach((row: { id: string }, idx: number) => {
      sequenceMap.set(row.id, idx + 1);
    });
    
    const orderNumber = formatOrderNumber(sequenceMap.get(order.id) || 0);

    const responseData = {
      id: order.id,
      orderNumber,
      customer: customerInfo,
      status: order.status,
      total: Number(order.total),
      items,
      shipping_address: order.shipping_address,
      shipping_address_id: order.shipping_address_id,
      payment_method: order.payment_method,
      tracking_number: order.tracking_number,
      courier: order.courier,
      assigned_courier_name: (order.assigned_courier as any)?.name || null,
      paid_at: order.paid_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      discount_amount: Number(order.discount_amount) || 0,
      shipping_cost: Number(order.shipping_cost) || 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      status_history: statusHistory || [],
    };

    console.log('[PUT] Success! Returning updated order');

    if ((status === 'shipped' || status === 'delivered') && currentStatus !== status) {
      sendOrderStatusEmail(orderId).catch((err: any) => {
        console.error('Failed to send order status email:', err);
      });
    }

    // Trigger in-app notification for the customer
    if (order.user_id && currentStatus !== status) {
      const getStatusTitle = (s: string) => {
        switch (s) {
          case 'processing': return 'Order Processing';
          case 'shipped': return 'Order Shipped';
          case 'delivered': return 'Order Delivered';
          case 'cancelled': return 'Order Cancelled';
          default: return `Order Update: ${s.charAt(0).toUpperCase() + s.slice(1)}`;
        }
      };

      const getStatusType = (s: string): 'info' | 'success' | 'warning' | 'error' | 'order' => {
        if (s === 'delivered') return 'success';
        if (s === 'cancelled') return 'error';
        if (s === 'shipped' || s === 'processing') return 'order';
        return 'info';
      };

      const getStatusMessage = (s: string) => {
        if (s === 'delivered') return 'Your order has been delivered. Enjoy!';
        return `Your order has been ${s}!`;
      };

      createNotification({
        userId: order.user_id,
        title: getStatusTitle(status),
        message: getStatusMessage(status),
        type: getStatusType(status),
        link: `/orders/${order.id}`,
        targetRole: 'customer',
      }).catch((err: any) => console.error('Failed to trigger customer notification:', err));

      if (status === 'delivered' && isManualOverride && order.courier_id) {
         createNotification({
           userId: order.courier_id,
           title: 'Delivery Confirmed by Admin',
           message: `Order ${orderNumber} has been manually confirmed as delivered by the admin. Please ensure proof of delivery is submitted.`,
           type: 'warning',
           link: `/courier/dashboard`,
           targetRole: 'courier'
         }).catch((err: any) => console.error('Failed to trigger courier notification:', err));
      }
    }

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






