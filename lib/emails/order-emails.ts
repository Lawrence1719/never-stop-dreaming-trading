import { getClient } from '@/lib/supabase/admin';
import { transporter, defaultFrom } from './mailer';

// Safely format price directly here since importing formatting might have issues if not in a server context, 
// though it should be fine. Let's import it safely.
import { formatPrice } from '@/lib/utils/formatting';

const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

// Define styles for dark theme matching NSD
const styles = {
  container: 'background-color: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 20px;',
  header: 'color: #0ea5e9; text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px;',
  content: 'background-color: #1e293b; border-radius: 8px; padding: 20px; margin-top: 20px;',
  table: 'width: 100%; border-collapse: collapse; margin-top: 15px;',
  th: 'text-align: left; padding: 10px; border-bottom: 1px solid #334155; color: #94a3b8;',
  td: 'padding: 10px; border-bottom: 1px solid #334155; color: #f8fafc;',
  totalRow: 'font-weight: bold; font-size: 1.1em; color: #f8fafc;',
  button: 'display: inline-block; background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;'
};

export async function sendOrderConfirmationEmail(orderId: string) {
  try {
    const supabaseAdmin = getClient();
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Failed to fetch order for email:', orderError);
      return;
    }

    // Try to get the email from the shipping address first, then fallback to user profile
    const userEmail = order.shipping_address?.email || (await supabaseAdmin.auth.admin.getUserById(order.user_id)).data.user?.email;

    if (!userEmail) {
      console.error('No email found for order:', order.id);
      return;
    }

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="${styles.td}">${item.name}</td>
        <td style="${styles.td}">${item.quantity}</td>
        <td style="${styles.td}">${formatPrice(item.price)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="${styles.container}">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${getAppUrl()}/nsd_dark_long_logo.png" alt="Never Stop Dreaming Trading" style="height: 60px; width: auto;">
        </div>
        <h1 style="${styles.header}">Order Confirmed - Never Stop Dreaming Trading</h1>
        <div style="${styles.content}">
          <p style="color: #f8fafc;">Thank you for your order! Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been successfully placed.</p>
          
          <h3 style="color: #e2e8f0; margin-top: 20px;">Order Details</h3>
          <table style="${styles.table}">
            <thead>
              <tr>
                <th style="${styles.th}">Item</th>
                <th style="${styles.th}">Qty</th>
                <th style="${styles.th}">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="2" style="${styles.td} text-align: right; ${styles.totalRow}">Total:</td>
                <td style="${styles.td} ${styles.totalRow}">${formatPrice(order.total)}</td>
              </tr>
            </tbody>
          </table>

          <h3 style="color: #e2e8f0; margin-top: 20px;">Shipping Address</h3>
          <p style="color: #cbd5e1; line-height: 1.5;">
            ${order.shipping_address.full_name}<br>
            ${order.shipping_address.street_address}<br>
            ${order.shipping_address.city}, ${order.shipping_address.province} ${order.shipping_address.zip_code}<br>
            Phone: ${order.shipping_address.phone}
          </p>

          <p style="color: #cbd5e1; margin-top: 20px;">We'll send you another email when your order has been shipped!</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${getAppUrl()}/orders/${order.id}" style="${styles.button}">View Order Status</a>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: 'Order Confirmed - Never Stop Dreaming Trading',
      html
    });

    console.log('Order confirmation email sent to', userEmail);
  } catch (err) {
    console.error('Error sending order confirmation email:', err);
  }
}

export async function sendOrderStatusEmail(orderId: string) {
  try {
    const supabaseAdmin = getClient();
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) return;

    // Try to get the email from the shipping address first, then fallback to user profile
    const userEmail = order.shipping_address?.email || (await supabaseAdmin.auth.admin.getUserById(order.user_id)).data.user?.email;

    if (!userEmail) return;

    let statusTitle = '';
    let statusMessage = '';
    
    if (order.status === 'shipped') {
      statusTitle = 'Your Order Has Shipped!';
      statusMessage = `Great news! Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> is on its way.`;
    } else if (order.status === 'delivered') {
      statusTitle = 'Your Order Has Been Delivered!';
      statusMessage = `Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has arrived. We hope you love it!`;
    } else {
      // Don't send emails for other status updates
      return; 
    }

    const html = `
      <div style="${styles.container}">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${getAppUrl()}/nsd_dark_long_logo.png" alt="Never Stop Dreaming Trading" style="height: 60px; width: auto;">
        </div>
        <h1 style="${styles.header}">${statusTitle}</h1>
        <div style="${styles.content}">
          <p style="color: #f8fafc;">${statusMessage}</p>
          
          ${order.status === 'shipped' && order.tracking_number ? `
            <div style="background-color: #334155; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #94a3b8; font-size: 0.9em;">Tracking Number:</p>
              <p style="margin: 5px 0 0 0; font-size: 1.25em; font-family: monospace; color: #f8fafc;">${order.tracking_number}</p>
              ${order.courier ? `<p style="margin: 5px 0 0 0; color: #cbd5e1;">Courier: ${order.courier}</p>` : ''}
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            <a href="${getAppUrl()}/orders/${order.id}" style="${styles.button}">View Order Details</a>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: `${statusTitle} - Never Stop Dreaming Trading`,
      html
    });

    console.log('Order status email sent to', userEmail);
  } catch (err) {
    console.error('Error sending order status email:', err);
  }
}
