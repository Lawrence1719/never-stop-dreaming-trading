import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from '@/lib/emails/order-emails';
import { createNotification, checkLowStockAndNotify } from '@/lib/notifications/service';

/**
 * POST /api/orders/create
 * Creates a new order with idempotency protection
 * 
 * Headers:
 * - Authorization: Bearer <token>
 * - Idempotency-Key: <unique-key>
 * 
 * Body:
 * - user_id: UUID
 * - status: string
 * - total: number
 * - items: array
 * - shipping_address_id: UUID
 * - payment_method: string
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session from the request
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get idempotency key from header
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return NextResponse.json({
        error: 'Idempotency-Key header is required'
      }, { status: 400 });
    }

    // Create a Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The RPC will handle the idempotency check in a single database transaction,
    // so we don't need the explicit check here anymore. We will proceed straight to RPC.

    // Parse request body
    const body = await request.json();
    const {
      user_id,
      status,
      total,
      items,
      shipping_address_id,
      payment_method,
    } = body;

    // Validate required fields
    if (!user_id || !status || total === undefined || !items || !shipping_address_id || !payment_method) {
      return NextResponse.json({
        error: 'Missing required fields: user_id, status, total, items, shipping_address_id, payment_method'
      }, { status: 400 });
    }

    // Verify user_id matches authenticated user
    if (user_id !== user.id) {
      return NextResponse.json({
        error: 'user_id does not match authenticated user'
      }, { status: 403 });
    }

    // Add idempotency key to the request payload
    const rpcPayload = {
      ...body,
      idempotency_key: idempotencyKey
    };

    // Execute atomic checkout transaction via RPC
    const { data: result, error: rpcError } = await supabaseClient
      .rpc('process_checkout', { payload: rpcPayload });

    if (rpcError) {
      console.error('Failed to create order via RPC', rpcError);

      // Map specific database errors to user-friendly messages
      let errorMessage = 'Something went wrong while placing your order. Please try again.';
      let statusCode = 500;

      if (rpcError.message?.includes('Out of stock')) {
        errorMessage = rpcError.message;
        statusCode = 409;
      } else if (rpcError.message?.includes('Variant not found')) {
        errorMessage = 'One or more items in your cart is no longer available.';
        statusCode = 404;
      } else if (rpcError.code === 'P0001' || rpcError.message?.includes('check constraint')) {
        // Custom constraint or validation error
        errorMessage = 'There was a validation error with your order. Please check your information.';
        statusCode = 400;
      }

      return NextResponse.json({
        error: errorMessage,
        code: rpcError.code,
        details: rpcError.details
      }, { status: statusCode });
    }

    const { data: createdOrder, duplicate, message } = result;

    if (createdOrder?.id && !duplicate) {
      sendOrderConfirmationEmail(createdOrder.id).catch((err: any) => {
        console.error('Failed to trigger order confirmation email:', err);
      });

      // Notify customer about order receipt
      createNotification({
        userId: user.id,
        title: 'Order Received!',
        message: 'Order Received! We are processing your order.',
        type: 'success',
        link: `/profile/orders/${createdOrder.id}`,
        targetRole: 'customer',
      }).catch(err => console.error('Failed to notify customer of new order:', err));

      // Notify all admins about the new order
      (async () => {
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
          );
          
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          const customerName = profile?.name || 'A customer';

          const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

          if (admins && admins.length > 0) {
            const orderNum = createdOrder.id.slice(0, 8).toUpperCase();
            for (const admin of admins) {
              await createNotification({
                userId: admin.id,
                title: 'New Order Received',
                message: `New order #${orderNum} received from ${customerName}. Total: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(total)}.`,
                type: 'success',
                link: `/admin/orders/${createdOrder.id}`,
                targetRole: 'admin',
              }).catch(err => console.error('Failed to notify admin of new order:', err));
            }
          }
        } catch (err) {
          console.error('Error in admin new order notification:', err);
        }
      })();

      // Check for low stock levels and notify admins
      if (items && Array.isArray(items)) {
        checkLowStockAndNotify(items).catch((err: any) => {
          console.error('Failed to run low stock check:', err);
        });
      }
    }

    return NextResponse.json({
      data: createdOrder,
      duplicate,
      message
    }, { status: 201 });

  } catch (error) {
    console.error('Error in order creation', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}












