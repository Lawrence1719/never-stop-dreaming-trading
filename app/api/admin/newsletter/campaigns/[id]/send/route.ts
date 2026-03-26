import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { transporter, defaultFrom } from '@/lib/emails/mailer';
import { renderNewsletterEmail } from '@/lib/emails/newsletter-template';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getClient();

    // Fetch the campaign
    const { data: campaign, error: fetchError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !campaign) {
      console.error('Error fetching campaign for sending:', fetchError);
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'sent') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 });
    }

    // Fetch all active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('is_active', true);

    if (subError) {
      console.error('Error fetching subscribers:', subError);
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers found' }, { status: 400 });
    }

    // Mark as sending
    const { error: sendingError } = await supabase
      .from('newsletter_campaigns')
      .update({ status: 'sending' })
      .eq('id', id);

    if (sendingError) {
      console.error('Error updating campaign to sending status:', sendingError);
      return NextResponse.json({ error: 'Failed to update campaign status' }, { status: 500 });
    }

    const recipientEmails = subscribers.map(s => s.email);
    const totalRecipients = recipientEmails.length;

    try {
      // Send emails
      const mailOptions = {
        from: defaultFrom,
        bcc: recipientEmails.join(', '), 
        subject: campaign.subject,
        html: renderNewsletterEmail(campaign.subject, campaign.content),
      };

      await transporter.sendMail(mailOptions);

      // Update campaign as sent
      const { error: updateError } = await supabase
        .from('newsletter_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipients_count: totalRecipients,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating campaign status after sending:', updateError);
      }

      return NextResponse.json({
        message: 'Campaign sent successfully',
        recipients_count: totalRecipients,
      });
    } catch (sendError) {
      console.error('Error sending emails:', sendError);
      
      // Revert status to draft on failure
      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft' })
        .eq('id', id);

      return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
    }
  } catch (error) {
    console.error('Admin campaign send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
