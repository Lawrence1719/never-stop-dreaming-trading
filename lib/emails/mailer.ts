import nodemailer from 'nodemailer';

const user = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.NEXT_PUBLIC_SMTP_USER;
const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

/**
 * Centered mail transporter for the application.
 * Note: For Supabase Auth emails (signup/password), 
 * configuration should be done in the Supabase Dashboard SMTP settings.
 */
export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const defaultFrom = `"Never Stop Dreaming Trading" <${user}>`;
