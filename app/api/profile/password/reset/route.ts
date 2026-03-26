import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { sendPasswordChangeEmail } from '@/lib/emails/profile-emails';

export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // Find user by email to verify token in metadata
    const { data: { users }, error: findError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (findError || !users) {
      console.error('Failed to list users', findError);
      return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { resetToken, resetTokenExpires } = user.user_metadata || {};

    if (!resetToken || resetToken !== token) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const expiresDate = new Date(resetTokenExpires);
    if (isNaN(expiresDate.getTime()) || expiresDate < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 401 });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { 
        password: newPassword,
        user_metadata: { 
          ...user.user_metadata,
          resetToken: null,
          resetTokenExpires: null
        } 
      }
    );

    if (updateError) {
      console.error('Failed to update password', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send final confirmation email
    await sendPasswordChangeEmail(email, user.user_metadata?.name || 'User');

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
