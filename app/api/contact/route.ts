import { NextRequest, NextResponse } from 'next/server';
import {
  getContactAdminEmail,
  sendContactAdminNotification,
  sendContactCustomerConfirmation,
} from '@/lib/emails/contact-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(subject) || !isNonEmptyString(message)) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required.' },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const adminTo = getContactAdminEmail();
    if (!adminTo) {
      console.error('[contact] No admin recipient configured (set STORE_ADMIN_EMAIL or similar).');
      return NextResponse.json(
        { error: 'Contact form is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const payload = {
      name,
      email,
      subject,
      message,
      timestampIso: new Date().toISOString(),
    };

    await sendContactAdminNotification(adminTo, payload);
    await sendContactCustomerConfirmation(payload);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] Failed to process inquiry', err);
    return NextResponse.json(
      { error: 'Failed to send your message. Please try again later.' },
      { status: 500 }
    );
  }
}
