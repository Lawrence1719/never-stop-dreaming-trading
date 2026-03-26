import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { sendProfileUpdateEmail } from '@/lib/emails/profile-emails';

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
    .select('role')
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

  return { error: null, status: 200, user };
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { name, phone } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // Update profile in database
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        name,
        phone,
      })
      .eq('id', authResult.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update profile', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update user metadata in auth for consistency if needed
    // Note: This is optional but good for ensuring JWT remains accurate after fresh login
    await supabaseAdmin.auth.admin.updateUserById(authResult.user.id, {
      user_metadata: { name, phone }
    });

    // Send confirmation email
    if (authResult.user.email) {
      await sendProfileUpdateEmail(authResult.user.email, name);
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
