'use server';

import { createServerClient } from '@/lib/supabase/server';
import { sendEmailChangeAlertEmail, sendEmailChangeConfirmationEmail } from '@/lib/emails/profile-emails';
import { revalidatePath } from 'next/cache';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';

export async function changeEmailAction(newEmail: string) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Starting email change to: ${newEmail}`);

  try {
    const supabase = await createServerClient();
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Get current user and profile data
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[${requestId}] Auth error:`, authError);
      return { error: 'Unauthorized. Please log in again.' };
    }

    const oldEmail = user.email;
    if (!oldEmail) {
      return { error: 'Current email not found.' };
    }

    if (oldEmail.toLowerCase() === newEmail.toLowerCase()) {
      return { error: 'New email must be different from current email.' };
    }

    // 2. Fetch profile to get the most accurate name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const userName = profile?.name || user.user_metadata?.name || 'NSD User';
    console.log(`[${requestId}] User identified: ${userName} (${oldEmail})`);

    // 3. Update user in Supabase Auth via ADMIN SDK to ensure it's forced and instant
    // This bypasses "Secure email change" settings if any are still active
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email: newEmail, email_confirm: true }
    );

    if (updateError) {
      console.error(`[${requestId}] Supabase Admin Auth Update Error:`, updateError);
      return { error: updateError.message };
    }

    console.log(`[${requestId}] Auth record updated successfully`);

    // 4. Sync to profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', user.id);

    if (profileError) {
      console.error(`[${requestId}] Profile Sync Error:`, profileError);
      // We continue since the Auth record (the source of truth for login) is updated
    } else {
      console.log(`[${requestId}] Profile record updated successfully`);
    }

    // 5. Trigger Nodemailer notifications
    try {
      console.log(`[${requestId}] Sending notifications...`);
      // Notify old email (security alert)
      await sendEmailChangeAlertEmail(oldEmail, userName);
      
      // Notify new email (confirmation)
      await sendEmailChangeConfirmationEmail(newEmail, userName);
      console.log(`[${requestId}] Notifications sent`);
    } catch (emailErr) {
      console.error(`[${requestId}] Email notification failed:`, emailErr);
      // Don't fail the whole action if just emails fail
    }

    revalidatePath('/profile/settings');
    revalidatePath('/profile');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected Error:`, error);
    return { error: error.message || 'An unexpected error occurred. Please try again.' };
  }
}
