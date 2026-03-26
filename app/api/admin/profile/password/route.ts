import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordChangeEmail } from '@/lib/emails/profile-emails';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { error: 'Unauthorized - No token provided', status: 401, user: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    return { error: 'Server configuration error', status: 500, user: null };
  }

  // Create client with user's token for auth check
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    console.error('Auth error:', userError?.message || 'No user found');
    return { error: 'Unauthorized - Invalid token', status: 401, user: null };
  }

  const { data: profile, error: profileError } = await supabaseUser
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to load profile', profileError);
    return { error: 'Unable to verify user role', status: 500, user: null };
  }

  // Check if user is super admin via env var or has admin role in database
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
  const isSuperAdmin = !!(superAdminEmail && user.email === superAdminEmail);
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  if (!isAdmin) {
    return { error: 'Forbidden', status: 403, user: null };
  }

  return { error: null, status: 200, user, name: profile.name };
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // Update password in auth (server-side via admin API)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authResult.user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Failed to update password', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send confirmation email
    if (authResult.user.email) {
      await sendPasswordChangeEmail(authResult.user.email, authResult.name || 'Admin');
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
