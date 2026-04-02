import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { verifyStaffAccess } from '@/lib/admin/staff';

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
    const { active } = await request.json();
    const supabaseAdmin = getClient();

    if (id === authResult.user.id && active === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }

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

    const existingMetadata = targetUser.user.user_metadata || {};
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        ...existingMetadata,
        blocked: active === false,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (active === true) {
      await supabaseAdmin
        .from('profiles')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('role', 'admin');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update staff status', error);
    return NextResponse.json({ error: 'Failed to update staff status' }, { status: 500 });
  }
}
