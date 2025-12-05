import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(
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

    // Check if target is super admin
    const supabaseAdmin = getClient();
    let targetEmail = '';
    try {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);
      targetEmail = targetUser?.user?.email || '';
    } catch (err) {
      console.error('Error checking target user:', err);
    }

    const targetIsSuperAdmin = superAdminEmail && targetEmail === superAdminEmail;
    
    // Only super admin can unblock super admin accounts
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot unblock super admin account' }, { status: 403 });
    }

    // Use admin client for the actual operation
    const { error: unblockError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { blocked: false },
    });

    if (unblockError) {
      return NextResponse.json({ error: unblockError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to unblock customer', error);
    return NextResponse.json({ error: 'Failed to unblock customer' }, { status: 500 });
  }
}

