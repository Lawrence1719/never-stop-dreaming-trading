import { getClient } from '@/lib/supabase/admin';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'order' | 'stock' | 'user' | 'system';

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
 * Notifies all admins about a new product
 */
export async function notifyNewProduct(productName: string, productId: string) {
  console.log(`[NotificationService] Triggering notifyNewProduct for "${productName}" (ID: ${productId})`);
  const supabase = getClient();
  
  // Find all admins to notify them
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('[NotificationService] Error fetching admins for product notification:', adminError);
    return;
  }

  console.log(`[NotificationService] Found ${admins?.length || 0} admins to notify`);

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: 'New Product Added',
        message: `A new product "${productName}" has been added to the catalog.`,
        type: 'success',
        link: `/admin/products/${productId}`,
        targetRole: 'admin',
      }).then(() => {
        console.log(`[NotificationService] Successfully notified admin ${admin.id}`);
      }).catch(err => {
        console.error(`[NotificationService] Failed to notify admin ${admin.id}:`, err);
      });
    }
  }
}

/**
 * Notifies all admins about a new user registration
 */
export async function notifyNewUser(userName: string, userId: string) {
  console.log(`[NotificationService] Triggering notifyNewUser for "${userName}" (ID: ${userId})`);
  const supabase = getClient();
  
  // Find all admins to notify them
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('[NotificationService] Error fetching admins for user notification:', adminError);
    return;
  }

  console.log(`[NotificationService] Found ${admins?.length || 0} admins to notify`);

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: 'New User Registered',
        message: `New customer "${userName}" has just signed up.`,
        type: 'user',
        link: `/admin/customers?search=${encodeURIComponent(userName)}`,
        targetRole: 'admin',
      }).then(() => {
        console.log(`[NotificationService] Successfully notified admin ${admin.id}`);
      }).catch(err => {
        console.error(`[NotificationService] Failed to notify admin ${admin.id}:`, err);
      });
    }
  }
}

/**
 * Notifies all admins about a deleted product
 */
export async function notifyDeletedProduct(productName: string) {
  console.log(`[NotificationService] Triggering notifyDeletedProduct for "${productName}"`);
  const supabase = getClient();
  
  // Find all admins to notify them
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('[NotificationService] Error fetching admins for product deletion:', adminError);
    return;
  }

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: 'Product Deleted',
        message: `Product "${productName}" has been removed from the catalog.`,
        type: 'warning',
        link: '/admin/inventory',
        targetRole: 'admin',
      }).catch(err => console.error(`[NotificationService] Failed to notify admin ${admin.id} of deletion:`, err));
    }
  }
}

/**
 * Notifies all admins about a deleted customer
 */
export async function notifyDeletedUser(userName: string) {
  console.log(`[NotificationService] Triggering notifyDeletedUser for "${userName}"`);
  const supabase = getClient();
  
  // Find all admins to notify them
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('[NotificationService] Error fetching admins for user deletion:', adminError);
    return;
  }

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: 'User Account Deleted',
        message: `Customer account "${userName}" has been deleted.`,
        type: 'warning',
        link: '/admin/customers',
        targetRole: 'admin',
      }).catch(err => console.error(`[NotificationService] Failed to notify admin ${admin.id} of deletion:`, err));
    }
  }
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
