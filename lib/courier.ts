import { getClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/service';

/**
 * Assigns a courier to an order.
 * If manualCourierId is provided, it uses that courier.
 * Otherwise, it finds the least-loaded courier.
 */
export async function assignCourier(orderId: string, manualCourierId?: string) {
  const supabase = getClient();

  // 1. Determine courier to assign
  let assignedCourierId: string;

  if (manualCourierId) {
    assignedCourierId = manualCourierId;
  } else {
    // Find the least-loaded courier
    // We count active deliveries (assigned or in_transit)
    const { data: leastLoaded, error: loadError } = await supabase
      .from('courier_deliveries')
      .select('courier_id')
      .neq('status', 'delivered')
      .neq('status', 'failed');

    if (loadError) throw loadError;

    // Count occurrences
    const counts: Record<string, number> = {};
    leastLoaded?.forEach(d => {
      counts[d.courier_id] = (counts[d.courier_id] || 0) + 1;
    });

    // Get all available couriers
    const { data: allCouriers, error: courierError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'courier');

    if (courierError) throw courierError;
    if (!allCouriers || allCouriers.length === 0) {
      console.warn('No couriers found in the system to auto-assign.');
      return null;
    }

    // Sort couriers by load
    const sortedCouriers = allCouriers.sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
    assignedCourierId = sortedCouriers[0].id;
  }

  // 2. Insert into courier_deliveries
  const { data: delivery, error: deliveryError } = await supabase
    .from('courier_deliveries')
    .insert({
      order_id: orderId,
      courier_id: assignedCourierId,
      status: 'assigned'
    })
    .select('*, courier:profiles!courier_id(name)')
    .single();

  if (deliveryError) throw deliveryError;

  // 3. Update orders table
  const { error: orderError } = await supabase
    .from('orders')
    .update({ courier_id: assignedCourierId })
    .eq('id', orderId);

  if (orderError) throw orderError;

  // 4. Log to order_status_history
  const { data: currentOrder } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    old_status: currentOrder?.status || 'processing',
    new_status: 'shipped',
    notes: `Courier assigned: ${(delivery.courier as any)?.name || 'Assigned Courier'}`,
    changed_at: new Date().toISOString()
  });

  // 5. Send notification to courier
  await createNotification({
    userId: assignedCourierId,
    title: 'New Delivery Assigned',
    message: `You have a new delivery for Order #${orderId.slice(0, 8).toUpperCase()}`,
    type: 'order',
    link: `/courier/dashboard`,
    targetRole: 'courier'
  });

  return delivery;
}


