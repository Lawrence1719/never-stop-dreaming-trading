import { transporter, defaultFrom } from './mailer';

const getAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://never-stop-dreaming-trading.vercel.app';

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
  h1: 'color:#0ea5e9;font-size:20px;margin:0 0 16px 0;text-align:center;border-bottom:1px solid #1e293b;padding-bottom:16px;',
  p: 'color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 12px 0;',
  btn:
    'display:inline-block;background-color:#0ea5e9;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;',
  footer: 'color:#64748b;font-size:12px;text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #334155;',
};

function wrapBody(innerHtml: string, plainText: string) {
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
            ${innerHtml}
          </td>
        </tr>
        <tr>
          <td style="${styles.footer}">
            &copy; ${new Date().getFullYear()} Never Stop Dreaming Trading. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
  return { html, text: plainText };
}

export async function sendProfileUpdateEmail(email: string, name: string) {
  const safeName = escapeHtml(name);
  const { html, text } = wrapBody(
    `
    <h1 style="${styles.h1}">Profile Update Confirmation</h1>
    <p style="${styles.p}">Hello <strong style="color:#f8fafc;">${safeName}</strong>,</p>
    <p style="${styles.p}">This is a confirmation that your admin profile information (Name or Phone Number) has been successfully updated.</p>
    <p style="${styles.p}">If you did not make this change, please contact support immediately.</p>
    `,
    `Hello ${name},\n\nThis is a confirmation that your admin profile information (Name or Phone Number) has been successfully updated.\n\nIf you did not make this change, please contact support immediately.\n\n— Never Stop Dreaming Trading`,
  );

  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: 'Your Profile Has Been Updated - Never Stop Dreaming Trading',
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Profile update email sent: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending profile update email:', error);
    return { success: false, error };
  }
}

export async function sendPasswordChangeEmail(email: string, name: string) {
  const safeName = escapeHtml(name);
  const { html, text } = wrapBody(
    `
    <h1 style="${styles.h1}">Password Change Confirmation</h1>
    <p style="${styles.p}">Hello <strong style="color:#f8fafc;">${safeName}</strong>,</p>
    <p style="${styles.p}">This is a confirmation that the password for your admin account has been successfully changed.</p>
    <p style="${styles.p}"><strong style="color:#f87171;">If you did not make this change, please reset your password immediately and contact support.</strong></p>
    `,
    `Hello ${name},\n\nThis is a confirmation that the password for your admin account has been successfully changed.\n\nIf you did not make this change, please reset your password immediately and contact support.\n\n— Never Stop Dreaming Trading`,
  );

  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: 'Security Alert: Your Password Has Been Changed - Never Stop Dreaming Trading',
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password change email sent: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change email:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetLink(email: string, name: string, resetLink: string) {
  const safeName = escapeHtml(name);
  const { html, text } = wrapBody(
    `
    <h1 style="${styles.h1}">Verify Your Password Change</h1>
    <p style="${styles.p}">Hello <strong style="color:#f8fafc;">${safeName}</strong>,</p>
    <p style="${styles.p}">We received a request to change the password for your admin account. To proceed, please click the button below to verify your email and set a new password:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
      <tr>
        <td style="text-align:center;">
          <a href="${escapeHtml(resetLink)}" style="${styles.btn}">Verify &amp; Change Password</a>
        </td>
      </tr>
    </table>
    <p style="${styles.p}">This link will expire in 1 hour. If you did not request this change, you can safely ignore this email.</p>
    `,
    `Hello ${name},\n\nWe received a request to change the password for your admin account. Open this link to verify and set a new password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this change, you can ignore this email.\n\n— Never Stop Dreaming Trading`,
  );

  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: 'Action Required: Verify Your Password Change Request',
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset link email sent: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset link email:', error);
    return { success: false, error };
  }
}

export async function sendStaffWelcomeEmail(email: string, name: string, role: 'admin' | 'super_admin') {
  const roleLabel = role === 'super_admin' ? 'Super Admin' : 'Admin';
  const safeName = escapeHtml(name);
  const { html, text } = wrapBody(
    `
    <h1 style="${styles.h1}">Welcome to the Admin Team</h1>
    <p style="${styles.p}">Hello <strong style="color:#f8fafc;">${safeName}</strong>,</p>
    <p style="${styles.p}">Your staff account has been created successfully.</p>
    <p style="${styles.p}">You have been assigned the role of <strong style="color:#0ea5e9;">${escapeHtml(roleLabel)}</strong>.</p>
    <p style="${styles.p}">Please verify your email address before logging in for the first time.</p>
    `,
    `Hello ${name},\n\nYour staff account has been created successfully.\n\nYou have been assigned the role of ${roleLabel}.\n\nPlease verify your email address before logging in for the first time.\n\n— Never Stop Dreaming Trading`,
  );

  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: `Welcome to Never Stop Dreaming Trading - ${roleLabel} Access`,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Staff welcome email sent: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending staff welcome email:', error);
    return { success: false, error };
  }
}
