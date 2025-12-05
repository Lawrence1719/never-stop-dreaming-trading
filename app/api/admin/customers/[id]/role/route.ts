import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // Create client with user's token for auth check
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    
    const { id } = await params;
    const body = await request.json();
    const { role } = body;
    
    if (!role || !['admin', 'customer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Check if user is super admin via env var or has admin role in database
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
    const isSuperAdmin = superAdminEmail && user.email === superAdminEmail;
    const isAdmin = profile?.role === 'admin' || isSuperAdmin;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent self-demotion
    if (id === user.id && role === 'customer') {
      return NextResponse.json({ error: 'Cannot demote your own account' }, { status: 400 });
    }

    // Use admin client for role update
    const supabaseAdmin = getClient();
    
    // Check if target is super admin
    let targetEmail = '';
    try {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);
      targetEmail = targetUser?.user?.email || '';
    } catch (err) {
      console.error('Error checking target user:', err);
    }

    const targetIsSuperAdmin = superAdminEmail && targetEmail === superAdminEmail;
    
    // Only super admin can change super admin roles
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot modify super admin role' }, { status: 403 });
    }

    // Prevent super admin from demoting themselves
    if (targetIsSuperAdmin && isSuperAdmin && id === user.id && role === 'customer') {
      return NextResponse.json({ error: 'Super admin cannot remove their own admin role' }, { status: 400 });
    }
    
    // Update role in profiles table
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to change role', error);
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
  }
}

