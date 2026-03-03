import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

      // Detailed error parsing if it is an out-of-stock custom PG error
      let errorMessage = rpcError.message || 'Failed to create order';
      if (errorMessage.includes('Out of stock')) {
        return NextResponse.json({ error: errorMessage }, { status: 409 });
      }

      return NextResponse.json({
        error: errorMessage
      }, { status: 500 });
    }

    const { data: createdOrder, duplicate, message } = result;

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












