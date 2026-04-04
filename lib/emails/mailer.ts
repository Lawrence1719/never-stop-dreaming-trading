import nodemailer from 'nodemailer';

const userRaw = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.NEXT_PUBLIC_SMTP_USER;
const passRaw = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

/** Gmail app passwords are 16 chars; pasted with spaces must be stripped or auth fails. */
const user = typeof userRaw === 'string' ? userRaw.trim() : userRaw;
const pass = typeof passRaw === 'string' ? passRaw.replace(/\s+/g, '') : passRaw;

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
