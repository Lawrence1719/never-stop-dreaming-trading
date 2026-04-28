import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Server-side API to verify OTP/Token-Hash.
 * This ensures the verification happens on our server before redirecting the user.
 */
export async function POST(request: NextRequest) {
  try {
    const { token_hash, type, email: newEmail } = await request.json();

    // Explicitly restrict to 'email_change' to prevent abuse of this endpoint
    // for other OTP types (like signup or recovery) if not intended.
    if (!token_hash || type !== 'email_change') {
      return NextResponse.json({ error: 'Invalid request or verification type' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createServerClient();

    // 1. Verify the OTP token first to ensure the link was valid
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error('[VerifyOTP] Supabase verification error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let userId = data.user?.id;
    
    // Fallback to current session if verifyOtp didn't return user directly
    if (!userId) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      userId = sessionUser?.id;
    }

    if (!userId || !newEmail) {
      console.error('[VerifyOTP] Identification failed:', { userId, hasNewEmail: !!newEmail });
      return NextResponse.json({ 
        error: `Could not identify ${!userId ? 'user' : 'new email'}. Please try again.` 
      }, { status: 400 });
    }

    console.info('[VerifyOTP] Token verified. Force-updating email for user:', userId, 'to:', newEmail);

    // 2. Force the email change in auth.users via Admin API (bypasses double opt-in)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true // Ensure it's marked as confirmed
    });

    if (authError) {
      console.error('[VerifyOTP] Failed to force-update auth email:', authError);
      return NextResponse.json({ error: 'Failed to finalize email change' }, { status: 500 });
    }

    // 3. Sync the new email to the profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId);
    
    if (profileError) {
      console.error('[VerifyOTP] Failed to update profile email via Admin:', profileError);
    }

    // Revalidate paths to clear any cached versions of the profile
    revalidatePath('/profile');
    revalidatePath('/profile/edit');
    revalidatePath('/', 'layout');

    return NextResponse.json({ 
      success: true,
      message: 'Email changed successfully' 
    });
  } catch (error: any) {
    console.error('[VerifyOTP] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
