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

    const supabase = await createServerClient();
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error('[VerifyOTP] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info('[VerifyOTP] Verification successful for user:', data.user?.id);
    console.info('[VerifyOTP] New email from auth:', data.user?.email);

    // After successful verification, we should also update the email in the profiles table
    // to keep it in sync with auth.users. Use the admin client to bypass RLS.
    const emailToSync = data.user?.email || newEmail;
    
    if (emailToSync) {
      console.info('[VerifyOTP] Syncing email to profiles table:', emailToSync);
      const supabaseAdmin = getSupabaseAdmin();
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ email: emailToSync })
        .eq('id', data.user?.id || '');
      
      if (profileError) {
        console.error('[VerifyOTP] Failed to update profile email via Admin:', profileError);
      }
    }

    // Revalidate paths to clear any cached versions of the profile
    revalidatePath('/profile');
    revalidatePath('/profile/edit');
    revalidatePath('/', 'layout');

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully' 
    });
  } catch (error: any) {
    console.error('[VerifyOTP] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
