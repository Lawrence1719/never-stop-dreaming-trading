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
  targetRole?: 'customer' | 'admin' | 'courier';
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
 * Checks items in an order and notifies admins if stock falls below threshold
 */
export async function checkLowStockAndNotify(items: any[]) {
  console.log(`[NotificationService] Running bulk low stock check for ${items.length} items.`);
  for (const item of items) {
    const variantId = item.variant_id || item.product_variant_id;
    if (variantId) {
      await notifyIfVariantLowStock(variantId);
    }
  }
}

/**
 * Checks a single variant's stock level and notifies admins if it's low or out of stock.
 * Prevents redundant unread notifications for the same variant to avoid spamming admins.
 */
export async function notifyIfVariantLowStock(variantId: string) {
  console.log(`[NotificationService] Checking stock status for variant ${variantId}`);
  const supabase = getClient();

  // Fetch variant details (including product name)
  const { data: variant, error: fetchError } = await supabase
    .from('product_variants')
    .select('id, variant_label, stock, reorder_threshold, product_id, products(id, name)')
    .eq('id', variantId)
    .single();

  if (fetchError || !variant) {
    console.error(`[NotificationService] Error fetching variant ${variantId} for stock check:`, fetchError);
    return;
  }

  const productName = (variant.products as any)?.name || 'Unknown Product';
  const label = variant.variant_label ? ` (${variant.variant_label})` : '';
  const threshold = variant.reorder_threshold ?? 5; // Use 5 as default if not specified

  // Status-based notification title and type
  const isOutOfStock = variant.stock === 0;
  const isLowStockStatus = variant.stock <= threshold;

  // Only notify if stock is low or zero
  if (isLowStockStatus) {
    const type = 'stock'; // Use dedicated stock type for all inventory alerts
    const title = isOutOfStock ? 'Out of Stock Alert' : 'Low Stock Alert';
    const message = isOutOfStock 
      ? `CRITICAL: Product "${productName}"${label} is completely out of stock!`
      : `Product "${productName}"${label} is running low (${variant.stock} remaining).`;
    
    // We link directly to the product edit page's variant tab if possible,
    // otherwise the general product edit page.
    const link = `/admin/products/${variant.product_id}/edit`;

    // Check for existing UNREAD notification for this variant/product to prevent duplicate spam
    // We check if any unread stock notification exists that mentions this specific product and variant
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('target_role', 'admin')
      .eq('is_read', false)
      .eq('type', 'stock')
      .like('message', `%${productName}%`)
      .like('message', `%${variant.variant_label || ''}%`)
      .limit(1);

    if (!existingNotifications || existingNotifications.length === 0) {
      // Find all admin users to notify them
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        console.log(`[NotificationService] Creating new ${type} alert for ${productName}${label}`);
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            title,
            message,
            type,
            link,
            targetRole: 'admin',
          }).catch(err => console.error(`[NotificationService] Failed to notify admin ${admin.id} of stock:`, err));
        }
      }
    } else {
      console.log(`[NotificationService] Unread alert exists for "${productName}${label}". Skipping duplicate.`);
    }
  }
}

/**
 * Notifies all admins about a cancelled order
 */
export async function notifyAdminsOrderCancelled(orderId: string, orderNumber: string) {
  const supabase = getClient();
  
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError || !admins) {
    console.error('[NotificationService] Error fetching admins for cancellation notification:', adminError);
    return;
  }

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: 'Order Cancelled',
      message: `Order ${orderNumber} has been cancelled by the customer.`,
      type: 'error',
      link: `/admin/orders/${orderId}`,
      targetRole: 'admin',
    }).catch(err => console.error(`[NotificationService] Failed to notify admin ${admin.id} of cancellation:`, err));
  }
}
