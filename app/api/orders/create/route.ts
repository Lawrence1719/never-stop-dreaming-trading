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

    // Check if order with this idempotency key already exists
    const { data: existingOrder, error: lookupError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    // If order exists, return it (idempotency - same request, same result)
    if (existingOrder && !lookupError) {
      return NextResponse.json({
        data: existingOrder,
        duplicate: true,
        message: 'Order already exists with this idempotency key'
      }, { status: 200 });
    }

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

    // Create new order with idempotency key
    const { data: createdOrder, error: createError } = await supabaseClient
      .from('orders')
      .insert({
        user_id,
        status,
        total,
        items,
        shipping_address_id,
        payment_method,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (createError) {
      // Check if error is due to duplicate idempotency key (race condition)
      if (createError.code === '23505' || createError.message.includes('unique') || createError.message.includes('duplicate')) {
        // Try to fetch the order that was created by concurrent request
        const { data: concurrentOrder } = await supabaseClient
          .from('orders')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .single();

        if (concurrentOrder) {
          return NextResponse.json({
            data: concurrentOrder,
            duplicate: true,
            message: 'Order was created by concurrent request'
          }, { status: 200 });
        }
      }

      console.error('Failed to create order', createError);
      return NextResponse.json({
        error: createError.message || 'Failed to create order'
      }, { status: 500 });
    }

    return NextResponse.json({
      data: createdOrder,
      duplicate: false,
      message: 'Order created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in order creation', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}









