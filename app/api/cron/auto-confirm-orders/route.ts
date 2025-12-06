import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/cron/auto-confirm-orders
 * Auto-confirm orders that have been delivered for 7+ days without customer confirmation
 * This endpoint should be called by a cron job daily
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authorization check for cron job
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff date (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find orders to auto-confirm
    const { data: ordersToConfirm, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, delivered_at')
      .eq('status', 'delivered')
      .is('confirmed_by_customer_at', null)
      .not('delivered_at', 'is', null)
      .lt('delivered_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      console.error('Failed to fetch orders for auto-confirmation:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch orders',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!ordersToConfirm || ordersToConfirm.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to auto-confirm',
        count: 0,
      });
    }

    // Auto-confirm these orders
    const now = new Date().toISOString();
    const orderIds = ordersToConfirm.map(o => o.id);

    const { data: updatedOrders, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        confirmed_by_customer_at: now,
        auto_confirmed: true,
        status: 'completed',
      })
      .in('id', orderIds)
      .select('id');

    if (updateError) {
      console.error('Failed to auto-confirm orders:', updateError);
      return NextResponse.json({ 
        error: 'Failed to auto-confirm orders',
        details: updateError.message
      }, { status: 500 });
    }

    console.log(`Auto-confirmed ${updatedOrders?.length || 0} orders`);

    return NextResponse.json({
      success: true,
      message: `Successfully auto-confirmed ${updatedOrders?.length || 0} orders`,
      count: updatedOrders?.length || 0,
      order_ids: updatedOrders?.map(o => o.id) || [],
    });
  } catch (error) {
    console.error('Error in auto-confirm cron job:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
