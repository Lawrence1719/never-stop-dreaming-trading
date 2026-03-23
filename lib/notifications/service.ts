import { getClient } from '@/lib/supabase/admin';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'order' | 'stock' | 'system';

export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link,
  targetRole = 'customer',
}: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  targetRole?: 'customer' | 'admin';
}) {
  const supabase = getClient();
  
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false,
        target_role: targetRole,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }

  return data;
}

/**
 * Checks items in an order and notifies admin if stock falls below threshold
 */
export async function checkLowStockAndNotify(items: any[]) {
  const supabase = getClient();
  const adminId = process.env.ADMIN_USER_ID; // Optional: fallback to all admins if not set

  for (const item of items) {
    const variantId = item.variant_id || item.product_variant_id;
    if (!variantId) continue;

    // Fetch current stock and threshold for the variant
    const { data: variant, error } = await supabase
      .from('product_variants')
      .select('id, variant_label, stock, reorder_threshold, product_id, products(name)')
      .eq('id', variantId)
      .single();

    if (error || !variant) continue;

    const productName = (variant.products as any)?.name || 'Unknown Product';
    const label = variant.variant_label ? ` (${variant.variant_label})` : '';

    if (variant.stock <= (variant.reorder_threshold || 0)) {
      // Find all admin users to notify them
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            title: 'Low Stock Alert',
            message: `Product "${productName}"${label} is low on stock (${variant.stock} remaining).`,
            type: 'warning',
            link: `/admin/inventory?search=${encodeURIComponent(productName)}`,
            targetRole: 'admin',
          }).catch(err => console.error('Failed to notify admin of low stock:', err));
        }
      }
    }
  }
}
