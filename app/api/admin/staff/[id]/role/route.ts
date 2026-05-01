import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClient } from '@/lib/supabase/admin';
import { isSuperAdminIdentity, verifyStaffAccess, type StaffRole } from '@/lib/admin/staff';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const authResult = await verifyStaffAccess(token, true);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const { role, currentPassword } = await request.json();

    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role.' }, { status: 400 });
    }

    const nextRole: StaffRole = role === 'super_admin' ? 'super_admin' : 'admin';

    if (id === authResult.user.id && nextRole === 'admin' && isSuperAdminIdentity(authResult.user)) {
      return NextResponse.json({ error: 'You cannot demote the current super admin account.' }, { status: 400 });
    }

    const supabaseAdmin = getClient();
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('role', 'admin')
      .single();

    if (existingProfileError || !existingProfile) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (targetUserError || !targetUser.user) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (nextRole === 'super_admin') {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Password confirmation is required.' }, { status: 400 });
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const verifier = createClient(supabaseUrl, supabaseAnonKey);

      const identifier = getIdentifier(request, authResult.user.id);
      try {
        const { success, reset } = await rateLimiters.auth.limit(identifier);
        if (!success) return rateLimitResponse(reset);
      } catch (err) {
        console.error('[RateLimit] Redis unavailable, failing open:', err);
      }

      const { error: passwordError } = await verifier.auth.signInWithPassword({
        email: authResult.user.email || '',
        password: currentPassword,
      });

      if (passwordError) {
        return NextResponse.json({ error: 'Password confirmation failed.' }, { status: 401 });
      }
    }

    const existingMetadata = targetUser.user.user_metadata || {};
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        ...existingMetadata,
        role: 'admin',
        isSuperAdmin: nextRole === 'super_admin',
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update staff role', error);
    return NextResponse.json({ error: 'Failed to update staff role' }, { status: 500 });
  }
}
