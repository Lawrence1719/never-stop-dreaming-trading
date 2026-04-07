import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/service';
import { sendOrderStatusEmail } from '@/lib/emails/order-emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // ── AUTH GUARD ──────────────────────────────────────────────────────────
    // 1. Extract Bearer token from Authorization header.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify the token against Supabase GoTrue using the service-role client
    //    (auth.getUser(token) validates the JWT server-side without needing cookies).
    const supabase = getClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Confirm the authenticated user has role = 'courier' in profiles.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'courier') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Parse the multipart body now that auth has passed.
    const formData = await request.formData();
    const file = formData.get('file') as File | Blob;
    const notes = (formData.get('notes') as string) || '';

    // courierId from the body MUST equal the authenticated user's ID.
    // This prevents a courier from submitting on behalf of another courier.
    const courierId = user.id;

    if (!file || !orderId) {
      const missing: string[] = [];
      if (!file) missing.push('file');
      if (!orderId) missing.push('orderId');
      console.error('[proof/upload] Missing required fields:', missing.join(', '));
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // 5. Confirm the authenticated courier is assigned to this order.
    const { data: assignment, error: assignmentError } = await supabase
      .from('courier_deliveries')
      .select('id, admin_overridden, status')
      .eq('order_id', orderId)
      .eq('courier_id', courierId)
      .maybeSingle();

    if (assignmentError) {
      console.error('[proof/upload] Assignment check error:', assignmentError);
      return NextResponse.json({ error: 'Failed to verify delivery assignment' }, { status: 500 });
    }

    if (!assignment) {
      // Courier is not assigned to this order — full stop.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // ── END AUTH GUARD ───────────────────────────────────────────────────────

    // Validate file type and size.
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }
    const type = (file as File).type || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are allowed' }, { status: 400 });
    }

    // Upload to Storage.
    const timestamp = Date.now();
    const fileExt = type.split('/')[1] || 'jpg';
    const fileName = `${orderId}/${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(fileName, file, {
        contentType: type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('delivery-proofs')
      .getPublicUrl(fileName);

    const isAdminOverridden =
      assignment.status === 'proof_pending' || assignment.admin_overridden;

    // Update courier_deliveries.
    const { error: deliveryUpdateError } = await supabase
      .from('courier_deliveries')
      .update({
        proof_image_url: publicUrl,
        delivery_notes: notes,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('courier_id', courierId);

    if (deliveryUpdateError) throw deliveryUpdateError;

    // Update orders (only if not already admin-overridden).
    if (!isAdminOverridden) {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderUpdateError) throw orderUpdateError;

      sendOrderStatusEmail(orderId).catch((err: unknown) => {
        console.error('[proof/upload] Failed to send delivered confirmation email:', err);
      });
    }

    // Log to history.
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      old_status: isAdminOverridden ? 'delivered' : 'shipped',
      new_status: 'delivered',
      changed_by: courierId,
      notes: isAdminOverridden
        ? 'Proof of delivery uploaded by courier after admin override'
        : 'Delivery confirmed by courier with proof of delivery',
      changed_at: new Date().toISOString(),
    });

    // Get courier name and customer info for notifications.
    const { data: order } = await supabase
      .from('orders')
      .select('user_id, courier:profiles!courier_id(name)')
      .eq('id', orderId)
      .single();

    const courierName = (order?.courier as { name?: string } | null)?.name || 'Unknown';

    if (!isAdminOverridden && order?.user_id) {
      await createNotification({
        userId: order.user_id,
        title: 'Order Delivered!',
        message: 'Your order has been delivered. Please confirm receipt.',
        type: 'success',
        link: `/orders/${orderId}`,
        targetRole: 'customer',
      });
    }

    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins) {
      await Promise.all(
        admins.map((admin) =>
          createNotification({
            userId: admin.id,
            title: isAdminOverridden ? 'Proof of Delivery Submitted' : 'Order Delivered',
            message: isAdminOverridden
              ? `Courier ${courierName} has uploaded proof of delivery for Order #${orderId.slice(0, 8).toUpperCase()} (previously admin-confirmed).`
              : `Order #${orderId.slice(0, 8).toUpperCase()} marked as delivered by courier ${courierName}.`,
            type: 'success',
            link: `/admin/orders/${orderId}`,
            targetRole: 'admin',
          }).catch((err: unknown) =>
            console.error('[proof/upload] Failed to notify admin:', err)
          )
        )
      );
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (error: unknown) {
    console.error('Error in proof upload API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
