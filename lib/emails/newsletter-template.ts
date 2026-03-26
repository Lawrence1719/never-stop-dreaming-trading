const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://never-stop-dreaming-trading.vercel.app';
};

const styles = {
  container: 'background-color: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;',
  wrapper: 'max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);',
  header: 'background-color: #0f172a; padding: 30px 20px; text-align: center; border-bottom: 1px solid #1e293b;',
  content: 'padding: 40px 30px; color: #e2e8f0; font-size: 16px;',
  footer: 'padding: 30px 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #1e293b; background-color: #0f172a;',
  link: 'color: #38bdf8; text-decoration: none; font-weight: 500;',
  unsubscribe: 'margin-top: 20px; display: block; color: #64748b; text-decoration: underline;'
};

/**
 * Basic HTML escaping to prevent XSS. 
 * NOTE: For rich HTML support in content, consider using a library like DOMPurify.
 */
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export function renderNewsletterEmail(subject: string, content: string, recipientEmail: string, businessAddress?: string) {
  const escapedSubject = escapeHtml(subject);
  
  // Basic HTML escaping for safety. 
  // For rich text support, use a proper sanitizer like DOMPurify if the input is trusted/controlled.
  const escapedContent = escapeHtml(content).replace(/\n/g, '<br>');
  const displayAddress = businessAddress || '123 Trading Way, Financial District, Philippines';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapedSubject}</title>
    </head>
    <body style="margin: 0; padding: 0; ${styles.container}">
      <div style="${styles.wrapper}">
        <div style="${styles.header}">
          <img src="${getAppUrl()}/nsd_dark_long_logo.png" alt="Never Stop Dreaming Trading" style="height: 50px; width: auto; display: block; margin: 0 auto;">
        </div>
        
        <div style="${styles.content}">
          ${escapedContent}
        </div>
        
        <div style="${styles.footer}">
          <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} Never Stop Dreaming Trading. All rights reserved.</p>
          <p style="margin: 0;">${displayAddress}</p>
          <div style="margin-top: 20px;">
            <a href="${getAppUrl()}" style="${styles.link}">Visit our store</a>
          </div>
          <a href="${getAppUrl()}/newsletter/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="${styles.unsubscribe}">Unsubscribe</a>
          <p style="margin-top: 15px; font-style: italic; font-size: 11px; color: #475569;">
            This email was sent to ${recipientEmail} because you subscribed to our newsletter.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
