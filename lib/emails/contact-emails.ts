import { transporter, defaultFrom } from './mailer';

const getAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://never-stop-dreaming-trading.vercel.app';

/** Inbound contact form notifications; falls back for local/dev setups */
export function getContactAdminEmail(): string | null {
  const to =
    process.env.STORE_ADMIN_EMAIL ||
    process.env.CONTACT_FORM_TO_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    '';
  const trimmed = to.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const styles = {
  outer: 'margin:0;padding:0;background-color:#0f172a;',
  wrap:
    'max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  card: 'background-color:#1e293b;border-radius:8px;padding:24px;border:1px solid #334155;',
  h1: 'color:#0ea5e9;font-size:20px;margin:0 0 16px 0;text-align:center;',
  label: 'color:#94a3b8;font-size:12px;text-transform:uppercase;margin:16px 0 4px 0;',
  value: 'color:#f8fafc;font-size:15px;line-height:1.5;margin:0;word-break:break-word;',
  btn:
    'display:inline-block;background-color:#0ea5e9;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;',
  footer: 'color:#64748b;font-size:12px;text-align:center;margin-top:24px;line-height:1.5;',
};

export type ContactInquiryPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  timestampIso: string;
};

export async function sendContactAdminNotification(adminTo: string, p: ContactInquiryPayload) {
  const safe = {
    name: escapeHtml(p.name),
    email: escapeHtml(p.email),
    subject: escapeHtml(p.subject),
    message: escapeHtml(p.message).replace(/\n/g, '<br>'),
    ts: escapeHtml(p.timestampIso),
  };
  const mailto = `mailto:${p.email}?subject=${encodeURIComponent(`Re: ${p.subject}`)}`;

  const html = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${styles.outer}">
  <tr>
    <td style="padding:24px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${styles.wrap}">
        <tr>
          <td style="text-align:center;padding-bottom:20px;">
            <img src="${getAppUrl()}/nsd_dark_long_logo.png" alt="Never Stop Dreaming Trading" width="200" height="auto" style="height:48px;width:auto;max-width:100%;">
          </td>
        </tr>
        <tr>
          <td style="${styles.card}">
            <h1 style="${styles.h1}">New Contact Inquiry</h1>
            <p style="${styles.label}">Subject</p>
            <p style="${styles.value}">${safe.subject}</p>
            <p style="${styles.label}">From</p>
            <p style="${styles.value}">${safe.name} &lt;${safe.email}&gt;</p>
            <p style="${styles.label}">Message</p>
            <p style="${styles.value}">${safe.message}</p>
            <p style="${styles.label}">Received</p>
            <p style="${styles.value}">${safe.ts}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
              <tr>
                <td style="text-align:center;">
                  <a href="${mailto}" style="${styles.btn}">Reply to Customer</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="${styles.footer}">Never Stop Dreaming Trading — contact form notification</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();

  const text = [
    'New contact inquiry',
    `Subject: ${p.subject}`,
    `From: ${p.name} <${p.email}>`,
    '',
    p.message,
    '',
    `Received: ${p.timestampIso}`,
    '',
    `Reply: mailto:${p.email}`,
  ].join('\n');

  await transporter.sendMail({
    from: defaultFrom,
    to: adminTo,
    replyTo: p.email,
    subject: `New Contact Inquiry - ${p.subject}`,
    text,
    html,
  });
}

export async function sendContactCustomerConfirmation(p: ContactInquiryPayload) {
  const summary =
    p.message.length > 280 ? `${p.message.slice(0, 277).trim()}…` : p.message;
  const safeName = escapeHtml(p.name);
  const safeSummary = escapeHtml(summary).replace(/\n/g, '<br>');

  const html = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${styles.outer}">
  <tr>
    <td style="padding:24px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${styles.wrap}">
        <tr>
          <td style="text-align:center;padding-bottom:20px;">
            <img src="${getAppUrl()}/nsd_dark_long_logo.png" alt="Never Stop Dreaming Trading" width="200" height="auto" style="height:48px;width:auto;max-width:100%;">
          </td>
        </tr>
        <tr>
          <td style="${styles.card}">
            <h1 style="${styles.h1}">We received your message</h1>
            <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Hi ${safeName},</p>
            <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Thanks for reaching out to Never Stop Dreaming Trading. Here is a copy of what you sent:</p>
            <div style="background-color:#334155;border-radius:6px;padding:16px;margin:16px 0;border-left:4px solid #0ea5e9;">
              <p style="color:#f8fafc;font-size:14px;line-height:1.5;margin:0;">${safeSummary}</p>
            </div>
            <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 8px 0;"><strong style="color:#0ea5e9;">What happens next</strong></p>
            <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0;">We'll get back to you within 24-48 hours.</p>
          </td>
        </tr>
        <tr>
          <td style="${styles.footer}">&copy; ${new Date().getFullYear()} Never Stop Dreaming Trading</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();

  const text = [
    `Hi ${p.name},`,
    '',
    'We received your message and will get back to you within 24-48 hours.',
    '',
    'Your message:',
    summary,
    '',
    '— Never Stop Dreaming Trading',
  ].join('\n');

  await transporter.sendMail({
    from: defaultFrom,
    to: p.email,
    subject: 'We received your message - Never Stop Dreaming Trading',
    text,
    html,
  });
}
