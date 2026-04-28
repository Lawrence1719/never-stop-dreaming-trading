import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmailChangeVerificationEmail } from '@/lib/emails/profile-emails';

/**
 * API route to handle email change requests using Nodemailer for custom branding.
 * This bypasses Supabase's default email templates while still using Supabase Auth for the logic.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail } = await request.json();
    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Generate the verification link for the NEW email.
    // This creates the pending email change in Supabase Auth.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'email_change_new',
      email: session.user.email!,
      newEmail: newEmail,
      options: {
        // Redirect back to our callback, which will then send the user to the profile page
        redirectTo: `${new URL(request.url).origin}/auth/callback?next=${encodeURIComponent('/profile?message=Email changed successfully')}`
      }
    });

    if (error) {
      console.error('[EmailChange] Supabase generateLink error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. The action_link is the URL that completes the verification when clicked.
    const actionLink = data.properties.action_link;
    
    // Get user's name for the email template
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .single();
    
    const userName = profile?.name || session.user.user_metadata?.name || 'User';

    // 3. Send the custom branded email via Nodemailer.
    const emailResult = await sendEmailChangeVerificationEmail(newEmail, userName, actionLink);

    if (!emailResult.success) {
      console.error('[EmailChange] Nodemailer send error:', emailResult.error);
      return NextResponse.json({ 
        error: 'Account updated in system, but failed to send the verification email. Please contact support.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification link sent to your new email address.' 
    });
  } catch (error: any) {
    console.error('[EmailChange] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
