import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetLink } from '@/lib/emails/profile-emails';
import crypto from 'crypto';

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { error: 'Unauthorized - No token provided', status: 401, user: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Server configuration error', status: 500, user: null };
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return { error: 'Unauthorized - Invalid token', status: 401, user: null };
  }

  // Get profile for the name
  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  return { error: null, status: 200, user, name: profile?.name || 'User' };
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthUser(request);
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    const supabaseAdmin = getClient();
    
    // Store token in user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authResult.user.id,
      { 
        user_metadata: { 
          ...authResult.user.user_metadata,
          resetToken,
          resetTokenExpires
        } 
      }
    );

    if (updateError) {
      console.error('Failed to store reset token', updateError);
      return NextResponse.json({ error: 'Failed to initiate reset' }, { status: 500 });
    }

    // Generate reset link (Customer version points to /profile/reset-password)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const resetLink = `${baseUrl}/profile/reset-password?token=${resetToken}&email=${authResult.user.email}`;

    // Send email
    if (authResult.user.email) {
      await sendPasswordResetLink(authResult.user.email, authResult.name || 'User', resetLink);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
