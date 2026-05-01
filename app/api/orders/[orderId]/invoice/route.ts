import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { formatOrderNumber } from '@/lib/utils/formatting';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/orders/[orderId]/invoice
 *
 * Returns JSON data needed for client-side PDF generation.
 * Auth: order owner OR admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getClient();

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const identifier = getIdentifier(request, user.id);
    try {
      const { success, reset } = await rateLimiters.expensive.limit(identifier);
      if (!success) return rateLimitResponse(reset);
    } catch (err) {
      console.error('[RateLimit] Redis unavailable, failing open:', err);
    }

    // Caller role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = callerProfile?.role === 'admin';

    // Fetch order + shipping address
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(
          full_name, street_address, city, province, zip_code, phone
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Auth: owner or admin
    if (!isAdmin && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Store settings
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['store_name', 'tagline', 'business_address', 'contact_email', 'contact_phone']);

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: { key: string; value: string }) => { settings[r.key] = r.value; });

    // Sequential order number
    const { data: allOrderIds } = await supabase
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    const sequenceMap = new Map<string, number>();
    (allOrderIds || []).forEach((r: { id: string }, idx: number) => sequenceMap.set(r.id, idx + 1));
    const seq = sequenceMap.get(order.id) ?? 0;
    const orderNumber = seq > 0 ? formatOrderNumber(seq) : `#${order.id.slice(0, 8).toUpperCase()}`;

    const addr = order.shipping_address || {};

    return NextResponse.json({
      orderNumber,
      createdAt: order.created_at,
      paymentMethod: order.payment_method,
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: null, // computed client-side from items
      discountAmount: Number(order.discount_amount) || 0,
      shippingCost: Number(order.shipping_cost) || 0,
      total: Number(order.total) || 0,
      shippingAddress: {
        fullName: addr.full_name || '',
        street: addr.street_address || '',
        city: addr.city || '',
        province: addr.province || '',
        zip: addr.zip_code || '',
        phone: addr.phone || '',
      },
      store: {
        name: settings.store_name || 'Never Stop Dreaming Trading',
        tagline: settings.tagline || '',
        address: settings.business_address || '',
        email: settings.contact_email || '',
        phone: settings.contact_phone || '',
      },
    });
  } catch (err) {
    console.error('[Invoice API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
