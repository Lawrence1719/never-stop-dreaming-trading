import nodemailer from 'nodemailer';

const user = process.env.SMTP_USER || process.env.NEXT_PUBLIC_SMTP_USER;
const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

/**
 * Centered mail transporter for the application.
 * Note: For Supabase Auth emails (signup/password), 
 * configuration should be done in the Supabase Dashboard SMTP settings.
 */
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user,
    pass,
  },
});

export const defaultFrom = `"Never Stop Dreaming Trading" <${user}>`;
