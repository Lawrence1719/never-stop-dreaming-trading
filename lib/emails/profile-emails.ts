import { transporter, defaultFrom } from './mailer';

export async function sendProfileUpdateEmail(email: string, name: string) {
  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: 'Your Profile Has Been Updated - Never Stop Dreaming Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #000;">Never Stop Dreaming Trading</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <h2>Profile Update Confirmation</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>This is a confirmation that your admin profile information (Name or Phone Number) has been successfully updated.</p>
          <p>If you did not make this change, please contact support immediately.</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} Never Stop Dreaming Trading. All rights reserved.</p>
        </div>
      </div>
    `,
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
  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: 'Security Alert: Your Password Has Been Changed - Never Stop Dreaming Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 88px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #000;">Never Stop Dreaming Trading</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <h2>Password Change Confirmation</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>This is a confirmation that the password for your admin account has been successfully changed.</p>
          <p><strong>If you did not make this change, please reset your password immediately and contact support.</strong></p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} Never Stop Dreaming Trading. All rights reserved.</p>
        </div>
      </div>
    `,
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
  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: 'Action Required: Verify Your Password Change Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #000;">Never Stop Dreaming Trading</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <h2>Verify Your Password Change</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We received a request to change the password for your admin account. To proceed, please click the button below to verify your email and set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify & Change Password</a>
          </div>
          <p>This link will expire in 1 hour. If you did not request this change, you can safely ignore this email.</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} Never Stop Dreaming Trading. All rights reserved.</p>
        </div>
      </div>
    `,
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
  const mailOptions = {
    from: defaultFrom,
    to: email,
    subject: `Welcome to Never Stop Dreaming Trading - ${roleLabel} Access`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #000;">Never Stop Dreaming Trading</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <h2>Welcome to the Admin Team</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your staff account has been created successfully.</p>
          <p>You have been assigned the role of <strong>${roleLabel}</strong>.</p>
          <p>Please verify your email address before logging in for the first time.</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} Never Stop Dreaming Trading. All rights reserved.</p>
        </div>
      </div>
    `,
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
