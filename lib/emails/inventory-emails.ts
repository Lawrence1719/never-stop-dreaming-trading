import { getClient } from '@/lib/supabase/admin';
import { transporter, defaultFrom } from './mailer';

const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.NEXT_PUBLIC_SITE_URL || 
         'https://never-stop-dreaming-trading.vercel.app';
};

// Consistent design look matching NSD dark theme
const styles = {
  container: 'background-color: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 20px;',
  header: 'color: #0ea5e9; text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px;',
  content: 'background-color: #1e293b; border-radius: 8px; padding: 20px; margin-top: 20px;',
  badge: (type: 'low' | 'out') => `display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; ${type === 'out' ? 'background-color: #be123c; color: #fff;' : 'background-color: #b45309; color: #fff;'}`,
  table: 'width: 100%; border-collapse: collapse; margin-top: 15px;',
  th: 'text-align: left; padding: 10px; border-bottom: 1px solid #334155; color: #94a3b8;',
  td: 'padding: 10px; border-bottom: 1px solid #334155; color: #f8fafc;',
  button: 'display: inline-block; background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;'
};

export async function sendInventoryAlertEmail(productName: string, variantLabel: string | null, sku: string, currentStock: number, threshold: number) {
  try {
    const supabaseAdmin = getClient();
    
    // 1. Fetch all admins
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .eq('role', 'admin');

    if (adminError || !admins || admins.length === 0) {
      console.error('[Inventory Email] No admins found or error:', adminError);
      return;
    }

    // 2. Get their emails from auth
    const adminEmails: string[] = [];
    for (const admin of admins) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(admin.id);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.error('[Inventory Email] No admin emails found');
      return;
    }

    const isOutOfStock = currentStock === 0;
    const alertType = isOutOfStock ? 'out' : 'low';
    const statusLabel = isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK';
    
    const html = `
      <div style="${styles.container}">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${getAppUrl()}/nsd_dark_long_logo.png" alt="Never Stop Dreaming Trading" style="height: 60px; width: auto;">
        </div>
        <h1 style="${styles.header}">Inventory Alert</h1>
        <div style="${styles.content}">
          <div style="${styles.badge(alertType)}">${statusLabel}</div>
          <p style="color: #f8fafc; font-size: 16px;">
            The following product ${isOutOfStock ? 'is currently out of stock' : 'has reached its reorder threshold'}.
          </p>
          
          <table style="${styles.table}">
            <tbody>
              <tr>
                <td style="${styles.td} color: #94a3b8; width: 120px;">Product:</td>
                <td style="${styles.td} font-weight: bold;">${productName}</td>
              </tr>
              ${variantLabel ? `
              <tr>
                <td style="${styles.td} color: #94a3b8;">Variant:</td>
                <td style="${styles.td}">${variantLabel}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="${styles.td} color: #94a3b8;">SKU:</td>
                <td style="${styles.td} font-family: monospace;">${sku}</td>
              </tr>
              <tr>
                <td style="${styles.td} color: #94a3b8;">Current Stock:</td>
                <td style="${styles.td} font-weight: bold; ${isOutOfStock ? 'color: #ef4444;' : 'color: #f59e0b;'}">${currentStock}</td>
              </tr>
              <tr>
                <td style="${styles.td} color: #94a3b8;">Threshold:</td>
                <td style="${styles.td}">${threshold}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${getAppUrl()}/admin/reports/inventory" style="${styles.button}">Manage Inventory</a>
          </div>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
          This is an automated system notification for NSD Trading Admins.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: defaultFrom,
      to: adminEmails.join(','),
      subject: `[INVENTORY ALERT] ${statusLabel}: ${productName}`,
      html
    });

    console.log(`[Inventory Email] Alert sent to ${adminEmails.length} admins for ${productName}`);
  } catch (err) {
    console.error('[Inventory Email] Error:', err);
  }
}
