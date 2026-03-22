import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { sendOrderStatusEmail } from '@/lib/emails/order-emails';

// Allowed status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  duplicate: ['cancelled'],
};

/**
 * PUT /api/admin/orders/[orderId]/status
 * Update order status with validation and history tracking
 */
export async function PUT(
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

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Log minimal debug info about incoming request for troubleshooting
    const authHeader = request.headers.get('authorization') || '';
    const hasToken = !!authHeader;
    const tokenPreview = authHeader.startsWith('Bearer ') ? `${(authHeader.length - 7)} chars` : 'none';
    console.log('[admin][orders][status] incoming request', { orderId, hasToken, tokenPreview });

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

    // Parse request body
    const body = await request.json();
    // Log request body for debugging (non-sensitive)
    try {
      console.debug('[admin][orders][status] request body:', body);
    } catch (e) {
      console.debug('[admin][orders][status] request body: <unserializable>');
    }
    const { status, tracking_number, courier, notes } = body;

    // Validate required fields
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'duplicate'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Fetch current order
    console.log('Fetching order with ID:', orderId, 'Type:', typeof orderId, 'Length:', orderId?.length);
    
    const { data: currentOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, paid_at, shipped_at, delivered_at')
      .eq('id', orderId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error on no rows

    if (orderError) {
      console.error('Error fetching order:', {
        orderId,
        error: orderError,
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint
      });
      
      return NextResponse.json({ 
        error: 'Failed to fetch order',
        details: orderError.message || 'Database error',
        code: orderError.code
      }, { status: 500 });
    }

    if (!currentOrder) {
      console.error('Order not found:', { orderId });
      return NextResponse.json({ 
        error: 'Order not found',
        details: `No order found with ID: ${orderId}. Please check the order ID and try again.`
      }, { status: 404 });
    }
    
    console.log('Order found:', { id: currentOrder.id, status: currentOrder.status });

    const currentStatus = currentOrder.status;

    // Validate status transition
    if (currentStatus === status) {
      return NextResponse.json({ 
        error: 'Status is already set to this value' 
      }, { status: 400 });
    }

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status transition. Cannot change from "${currentStatus}" to "${status}". Allowed transitions: ${allowedNextStatuses.join(', ') || 'none'}` 
      }, { status: 400 });
    }

    // Validate tracking information for shipped status
    if (status === 'shipped') {
      if (!tracking_number || tracking_number.trim().length < 3) {
        return NextResponse.json({ 
          error: 'Tracking number is required for shipped status (minimum 3 characters)' 
        }, { status: 400 });
      }
      if (!courier || courier.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Courier is required for shipped status' 
        }, { status: 400 });
      }
    }

    // Prepare update data
    // Note: updated_at is handled by trigger, but we can set it explicitly
    const updateData: any = {
      status,
    };

    // Set timestamps based on status
    // Only set if not already set (preserve original timestamp)
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

    // Update order
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update order', updateError);
      return NextResponse.json({ 
        error: 'Failed to update order status',
        details: updateError.message,
        code: updateError.code
      }, { status: 500 });
    }

    // Log status change to history (optional - don't fail if table doesn't exist)
    try {
      const { error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: currentStatus,
          new_status: status,
          changed_by: user.id,
          notes: notes?.trim() || null,
          tracking_number: status === 'shipped' ? tracking_number?.trim() : null,
          courier: status === 'shipped' ? courier?.trim() : null,
        });

      if (historyError) {
        console.error('Failed to log status history', historyError);
        // Don't fail the request if history logging fails - this is optional
      }
    } catch (historyErr) {
      console.error('Error logging status history (table may not exist yet)', historyErr);
      // Continue - history logging is optional
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      previous_status: currentStatus,
      new_status: status,
      updated_at: updatedOrder.updated_at,
      tracking_number: updatedOrder.tracking_number,
      courier: updatedOrder.courier,
    });
    
    // Trigger status email if shipped or delivered
    if (status === 'shipped' || status === 'delivered') {
      sendOrderStatusEmail(orderId).catch((err: any) => {
        console.error('Failed to send order status email:', err);
      });
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      previous_status: currentStatus,
      new_status: status,
      updated_at: updatedOrder.updated_at,
      tracking_number: updatedOrder.tracking_number,
      courier: updatedOrder.courier,
    });
  } catch (error) {
    console.error('Error updating order status', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

