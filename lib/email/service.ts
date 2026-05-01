import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://never-stop-dreaming-trading.vercel.app';

/**
 * Sends an email when a user requests account deletion.
 */
export async function sendDeletionRequestedEmail(email: string, name: string) {
  const restoreLink = `${APP_URL}/api/profile/restore`;
  
  const mailOptions = {
    from: `"Never Stop Dreaming Support" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Account Deletion Requested - NSD Trading',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Account Deletion Requested</h2>
        <p>Hello ${name},</p>
        <p>We received a request to delete your account at Never Stop Dreaming Trading. Your account has been marked for deletion and will be permanently removed in <strong>30 days</strong>.</p>
        <p>If you did not request this, or if you change your mind, you can restore your account immediately by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${restoreLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restore My Account</a>
        </div>
        <p>If you have any questions, please reply to this email.</p>
        <p>Best regards,<br/>The NSD Trading Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Deletion request email sent to ${email}`);
  } catch (error) {
    console.error('Error sending deletion request email:', error);
  }
}

/**
 * Sends a reminder email 5 days before final deletion.
 */
export async function sendDeletionReminderEmail(email: string, name: string) {
  const restoreLink = `${APP_URL}/api/profile/restore`;
  
  const mailOptions = {
    from: `"Never Stop Dreaming Support" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Action Required: Your account will be deleted in 5 days',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #d32f2f;">Final Warning: Account Deletion Imminent</h2>
        <p>Hello ${name},</p>
        <p>This is a reminder that your account at Never Stop Dreaming Trading is scheduled for permanent deletion in <strong>5 days</strong>.</p>
        <p>After this period, your profile and personal data will be anonymized or removed, and you will no longer be able to recover your account.</p>
        <p>To keep your account, click the button below now:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${restoreLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Keep My Account</a>
        </div>
        <p>Thank you for being part of our community.</p>
        <p>Best regards,<br/>The NSD Trading Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Deletion reminder email sent to ${email}`);
  } catch (error) {
    console.error('Error sending deletion reminder email:', error);
  }
}
