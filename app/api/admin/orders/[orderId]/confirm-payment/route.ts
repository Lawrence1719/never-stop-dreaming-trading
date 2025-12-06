import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin/orders/[orderId]/confirm-payment
 * Confirm COD payment after delivery
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

    const supabaseAdmin = getClient();
    
    // Verify admin user
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

    // Fetch current order
    const { data: currentOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_method, payment_status, delivered_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ 
        error: 'Failed to fetch order',
        details: orderError.message || 'Database error'
      }, { status: 500 });
    }

    if (!currentOrder) {
      return NextResponse.json({ 
        error: 'Order not found'
      }, { status: 404 });
    }

    // Validation: Only allow confirming payment for COD orders
    if (currentOrder.payment_method !== 'cod') {
      return NextResponse.json({ 
        error: 'Payment confirmation is only available for Cash on Delivery (COD) orders'
      }, { status: 400 });
    }

    // Validation: Payment must be pending
    if (currentOrder.payment_status === 'paid') {
      return NextResponse.json({ 
        error: 'Payment has already been confirmed for this order'
      }, { status: 400 });
    }

    // Update payment status
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update payment status', updateError);
      return NextResponse.json({ 
        error: 'Failed to confirm payment',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      payment_status: 'paid',
      paid_at: updatedOrder.paid_at,
    });
  } catch (error) {
    console.error('Error confirming payment', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
