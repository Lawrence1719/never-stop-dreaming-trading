import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/orders/[orderId]/confirm-receipt
 * Allow customer to confirm they received their order
 */
export async function POST(
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status, delivered_at, confirmed_by_customer_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validation: Order must belong to the user
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - This order does not belong to you' }, { status: 403 });
    }

    // Validation: Order must be delivered
    if (order.status !== 'delivered') {
      return NextResponse.json({ 
        error: 'Order must be delivered before you can confirm receipt',
        current_status: order.status
      }, { status: 400 });
    }

    // Validation: Order must have a delivery date
    if (!order.delivered_at) {
      return NextResponse.json({ 
        error: 'Order delivery date not found' 
      }, { status: 400 });
    }

    // Validation: Order must not already be confirmed
    if (order.confirmed_by_customer_at) {
      return NextResponse.json({ 
        error: 'Order receipt has already been confirmed',
        confirmed_at: order.confirmed_by_customer_at
      }, { status: 400 });
    }

    // Update order: confirm receipt and change status to completed
    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        confirmed_by_customer_at: now,
        auto_confirmed: false,
        status: 'completed',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to confirm receipt', updateError);
      return NextResponse.json({ 
        error: 'Failed to confirm receipt',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for confirming receipt!',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        confirmed_by_customer_at: updatedOrder.confirmed_by_customer_at,
        auto_confirmed: updatedOrder.auto_confirmed,
      },
    });
  } catch (error) {
    console.error('Error confirming receipt', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
