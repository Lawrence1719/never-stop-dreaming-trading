import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/service';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import { rejectionReasonLabels } from '@/lib/constants/delivery';
import { formatOrderNumber } from '@/lib/utils/formatting';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.enum(['damaged_packaging', 'wrong_product', 'expired_product', 'other']),
  notes: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // 1. Auth Guard
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'courier') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Rate Limiting
    const identifier = getIdentifier(request, user.id);
    try {
      const { success, reset } = await rateLimiters.user.limit(identifier);
      if (!success) return rateLimitResponse(reset);
    } catch (err) {
      console.error('[RateLimit] Redis unavailable, failing open:', err);
    }

    // 3. Verify Assignment & Status
    const { data: assignment, error: assignmentError } = await supabase
      .from('courier_deliveries')
      .select('id, status, courier_id')
      .eq('order_id', orderId)
      .eq('courier_id', user.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Forbidden - Not assigned to this order' }, { status: 403 });
    }

    if (!['assigned', 'in_transit'].includes(assignment.status)) {
      return NextResponse.json({ error: 'Invalid status for rejection' }, { status: 400 });
    }

    // 4. Parse Body
    const body = await request.json();
    const result = rejectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid rejection data', details: result.error.format() }, { status: 400 });
    }
    const { reason, notes } = result.data;

    // 5. Atomic-ish Updates (Sequential)
    // Fetch order data for notifications and history
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('*, items')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Start Updates
    // A. Update courier_deliveries
    const { error: deliveryUpdateError } = await supabase
      .from('courier_deliveries')
      .update({
        status: 'failed',
        rejection_reason: reason,
        rejection_notes: notes || null,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('courier_id', user.id);

    if (deliveryUpdateError) throw deliveryUpdateError;

    // B. Update orders status
    const { error: orderStatusUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderStatusUpdateError) throw orderStatusUpdateError;

    // C. Restore Stock
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const variantId = item.variant_id || item.variantId;
      const quantity = item.quantity;
      if (variantId && quantity > 0) {
        const { error: stockError } = await supabase.rpc('increment_stock', {
          row_id: variantId,
          amount: quantity
        });
        
        // If increment_stock RPC doesn't exist, we'll fall back to manual update
        // But better to check if we have a way to do it atomically.
        // Let's assume we might need to create the RPC or do it via direct update.
        // Direct update for now as we don't know if RPC exists.
        if (stockError) {
           const { data: currentVariant } = await supabase
             .from('product_variants')
             .select('stock')
             .eq('id', variantId)
             .single();
           
           if (currentVariant) {
             await supabase
               .from('product_variants')
               .update({ stock: currentVariant.stock + quantity })
               .eq('id', variantId);
           }
        }
      }
    }

    // D. Log Status History
    const reasonLabel = rejectionReasonLabels[reason];
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      old_status: order.status,
      new_status: 'cancelled',
      changed_by: user.id,
      notes: `Rejected at delivery: ${reasonLabel}`,
      changed_at: new Date().toISOString(),
    });

    // E. Notifications
    // Calculate readable order number
    const { data: allOrderIds } = await supabase
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    const sequenceMap = new Map<string, number>();
    (allOrderIds || []).forEach((row: { id: string }, idx: number) => {
      sequenceMap.set(row.id, idx + 1);
    });
    const orderNumber = formatOrderNumber(sequenceMap.get(orderId) || 0);

    // Admin Notification
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins) {
      await Promise.all(admins.map(admin => 
        createNotification({
          userId: admin.id,
          title: 'Delivery Rejected',
          message: `Order ${orderNumber} was rejected by the customer at delivery. Reason: ${reasonLabel}. The courier is returning the item.`,
          type: 'warning',
          link: `/admin/orders/${orderId}`,
          targetRole: 'admin',
        })
      ));
    }

    // Customer Notification
    if (order.user_id) {
      await createNotification({
        userId: order.user_id,
        title: 'Order Cancelled',
        message: `Your order ${orderNumber} was cancelled at delivery. If you have questions, please contact NSD directly.`,
        type: 'warning',
        link: `/orders/${orderId}`,
        targetRole: 'customer',
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[reject/post] Critical error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
