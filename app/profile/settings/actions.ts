'use server';

import { createServerClient } from '@/lib/supabase/server';
import { sendEmailChangeAlertEmail, sendEmailChangeConfirmationEmail } from '@/lib/emails/profile-emails';
import { revalidatePath } from 'next/cache';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';

export async function changeEmailAction(newEmail: string) {
  try {
    const supabase = await createServerClient();
    
    // Use getUser() for security as per constraints
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Unauthorized. Please log in again.' };
    }

    const oldEmail = user.email;
    if (!oldEmail) {
      return { error: 'Current email not found.' };
    }

    if (oldEmail === newEmail) {
      return { error: 'New email must be different from current email.' };
    }

    // Update user in Supabase Auth
    // Note: This assumes "Secure email change" is DISABLED in Supabase dashboard
    // so it updates immediately and doesn't send its own emails.
    const { error: updateError } = await supabase.auth.updateUser({ 
      email: newEmail 
    });

    if (updateError) {
      console.error('Supabase Email Update Error:', updateError);
      return { error: updateError.message };
    }

    // Sync to profiles table via Admin Client to bypass RLS if needed
    const supabaseAdmin = getSupabaseAdmin();
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile Email Sync Error:', profileError);
      // We continue because the Auth email was successfully changed
    }

    // Trigger Nodemailer notifications
    const userName = user.user_metadata?.name || 'NSD User';
    
    // Notify old email (security alert)
    await sendEmailChangeAlertEmail(oldEmail, userName);
    
    // Notify new email (confirmation)
    await sendEmailChangeConfirmationEmail(newEmail, userName);

    revalidatePath('/profile/settings');
    revalidatePath('/profile');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: any) {
    console.error('Change Email Action Error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}
