import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createNotification, notifyAdminsOrderCancelled, notifyIfVariantLowStock } from '@/lib/notifications/service';

/**
 * POST /api/orders/[orderId]/cancel
 * Allows a customer to cancel their own order if it's still pending or processing
 */
export async function POST(
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
    const supabaseAdmin = getClient();
    
    // 1. Get the user from the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch the order and verify ownership/status
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - You do not own this order' }, { status: 403 });
    }

    // 3. Check if order can be cancelled
    const cancellableStatuses = ['pending', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: `Order cannot be cancelled. Current status is ${order.status}.` 
      }, { status: 400 });
    }

    const { reason, note } = await request.json().catch(() => ({}));
    const oldStatus = order.status;

    // Perform cancellation updates
    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Log status history with the provided reason
    const formattedNote = `Cancellation reason: ${reason || 'Not specified'}.${note ? ` Customer note: ${note}` : ''}`;
    
    await supabaseAdmin
      .from('order_status_history')
      .insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: 'cancelled',
        changed_by: user.id,
        notes: formattedNote,
        changed_at: new Date().toISOString()
      });

    // 5. Restore stock
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const variantId = item.variant_id || item.variantId;
      const quantity = Number(item.quantity) || 0;

      if (variantId && quantity > 0) {
        // Increment stock in product_variants
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('stock')
          .eq('id', variantId)
          .single();

        if (variant) {
          await supabaseAdmin
            .from('product_variants')
            .update({ stock: variant.stock + quantity })
            .eq('id', variantId);
          
          // Trigger low stock check to auto-clear alerts if restocked (Fix 2)
          notifyIfVariantLowStock(variantId).catch(err => 
            console.error(`[OrderCancel] Failed to trigger stock check for variant ${variantId}:`, err)
          );
        }
      }
    }

    // 6. Send notifications
    const orderNumber = `ORD-${orderId.slice(0, 8).toUpperCase()}`;

    // To Admin
    await notifyAdminsOrderCancelled(orderId, orderNumber).catch(err => {
      console.error('Failed to notify admins of cancellation:', err);
    });

    // To Customer
    await createNotification({
      userId: user.id,
      title: 'Order Cancelled',
      message: `Your order ${orderNumber} was successfully cancelled.`,
      type: 'info',
      targetRole: 'customer',
      link: `/orders/${orderId}`
    });

    return NextResponse.json({ success: true, message: 'Order cancelled successfully' });

  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel order', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
