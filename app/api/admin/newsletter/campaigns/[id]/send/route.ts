import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { transporter, defaultFrom } from '@/lib/emails/mailer';
import { renderNewsletterEmail } from '@/lib/emails/newsletter-template';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
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

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return NextResponse.json({ error: 'Campaign already sent or in progress' }, { status: 400 });
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

    // Atomic send lock: Mark as sending only if it was a draft
    const { data: lockResult, error: sendingError } = await supabase
      .from('newsletter_campaigns')
      .update({ 
        status: 'sending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select('id')
      .single();

    if (sendingError || !lockResult) {
      return NextResponse.json({ error: 'Campaign send already in progress or completed' }, { status: 409 });
    }

    const recipientEmails = subscribers.map(s => s.email);
    const totalRecipients = recipientEmails.length;
    const BATCH_SIZE = 50;

    // Fetch business address for CAN-SPAM compliance
    const { data: addressSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_address')
      .single();
    
    const businessAddress = addressSetting?.value || '123 Trading Way, Financial District, Philippines';

    try {
      // Send emails individually to allow for personalized unsubscribe links
      for (const email of recipientEmails) {
        const htmlContent = renderNewsletterEmail(campaign.subject, campaign.content, email, businessAddress);
        
        await transporter.sendMail({
          from: defaultFrom,
          to: email,
          subject: campaign.subject,
          html: htmlContent,
        });
      }

      // Update campaign as sent
      const { error: updateError } = await supabase
        .from('newsletter_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipients_count: totalRecipients,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating campaign status after sending:', updateError);
        return NextResponse.json({
          message: 'Emails sent but failed to update campaign status',
          recipients_count: totalRecipients,
          warning: 'Campaign status may need manual update',
        }, { status: 207 });
      }

      return NextResponse.json({
        message: 'Campaign sent successfully',
        recipients_count: totalRecipients,
      });
    } catch (sendError) {
      console.error('Error sending emails:', sendError);
      
      // Revert status to draft on failure to allow retry
      await supabase
        .from('newsletter_campaigns')
        .update({ 
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
    }
  } catch (error) {
    console.error('Admin campaign send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
