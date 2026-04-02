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
    const { name, phone } = await request.json();
    const supabaseAdmin = getClient();

    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'admin')
      .single();

    if (existingProfileError || !existingProfile) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (name !== undefined || phone !== undefined) {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);
      const existingMetadata = targetUser?.user?.user_metadata || {};
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {
          ...existingMetadata,
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        },
      });

      if (authUpdateError) {
        return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update staff member', error);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}

export async function DELETE(
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
    const supabaseAdmin = getClient();

    if (id === authResult.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
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

    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);

    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('role', 'admin');

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        ...(targetUser.user.user_metadata || {}),
        blocked: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete staff member', error);
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 });
  }
}
