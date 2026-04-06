import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getClient();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds } = await request.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No orders to cleanup' });
    }

    console.log(`[Cleanup] Silently unassigning ghost orders:`, orderIds);

    // 1. Remove assignments from courier_deliveries
    const { error: dError } = await supabaseAdmin
      .from('courier_deliveries')
      .delete()
      .in('order_id', orderIds);

    if (dError) throw dError;

    // 2. Unset courier_id in orders table
    const { error: oError } = await supabaseAdmin
      .from('orders')
      .update({ courier_id: null })
      .in('id', orderIds);

    if (oError) throw oError;

    return NextResponse.json({ success: true, message: 'Ghost orders unassigned' });
  } catch (error: any) {
    console.error('[Cleanup] Failed to unassign ghost orders:', error);
    return NextResponse.json({ error: error.message || 'Cleanup failed' }, { status: 500 });
  }
}
