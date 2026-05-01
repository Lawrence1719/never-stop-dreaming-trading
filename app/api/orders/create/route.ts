import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from '@/lib/emails/order-emails';
import { createNotification, checkLowStockAndNotify } from '@/lib/notifications/service';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';

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

    const identifier = getIdentifier(request, user.id);
    try {
      const { success, reset } = await rateLimiters.user.limit(identifier);
      if (!success) return rateLimitResponse(reset);
    } catch (err) {
      console.error('[RateLimit] Redis unavailable, failing open:', err);
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
      applied_coupon_id,
      discount_amount,
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

    // Server-side Cavite province restriction
    const { data: addressData, error: addressError } = await supabaseClient
      .from('addresses')
      .select('province')
      .eq('id', shipping_address_id)
      .single();

    if (addressError || !addressData) {
      return NextResponse.json({ error: 'Delivery address not found.' }, { status: 400 });
    }

    if (addressData.province.trim().toLowerCase() !== 'cavite') {
      return NextResponse.json(
        { error: 'Delivery is only available within Cavite province.' },
        { status: 400 }
      );
    }

    // Server-side shipping configuration
    const { data: settingsData } = await supabaseClient
      .from('settings')
      .select('key, value')
      .eq('key', 'free_shipping_enabled')
      .single();

    const freeShippingEnabled = settingsData?.value !== 'false'; // Default to true if not found or true
    // TODO: When free_shipping_enabled is false, read shipping_fee from settings table. Currently defaults to 0 until NSD defines delivery zones and fees.
    const serverShippingCost = 0; // Fixed to 0 for now per instructions
    const serverShippingMethod = 'NSD Delivery';

    // Recalculate total if necessary (though instructions say set cost = 0 for now)
    // We'll trust the client total for now but override the shipping components
    const rpcPayload = {
      ...body,
      shipping_cost: serverShippingCost,
      shipping_method: serverShippingMethod,
      idempotency_key: idempotencyKey
    };

    console.info('[CheckoutAPI] Attempting order creation:', {
      userId: user.id,
      itemCount: items?.length,
      serverShippingCost,
      idempotencyKey
    });

    // Execute atomic checkout transaction via RPC
    const startTime = Date.now();
    const { data: result, error: rpcError } = await supabaseClient
      .rpc('process_checkout', { payload: rpcPayload });
    const duration = Date.now() - startTime;

    if (rpcError) {
      console.error('[CheckoutAPI] RPC Failed:', {
        errorCode: rpcError.code,
        message: rpcError.message,
        durationMs: duration,
        idempotencyKey
      });

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
        link: `/orders/${createdOrder.id}`,
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












