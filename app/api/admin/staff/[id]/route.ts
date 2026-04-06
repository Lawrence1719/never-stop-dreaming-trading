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

/**
 * RESTORE STAFF
 */
export async function POST(
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

    // 1. Restore the profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', id);

    if (updateError) throw updateError;

    // 2. Unblock the auth user
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);
    const existingMetadata = targetUser?.user?.user_metadata || {};
    
    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        ...existingMetadata,
        blocked: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Staff restored successfully' });
  } catch (error: any) {
    console.error('Failed to restore staff member', error);
    return NextResponse.json({ error: error.message || 'Failed to restore staff' }, { status: 500 });
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
      .select('id, name')
      .eq('id', id)
      .in('role', ['admin', 'courier'])
      .single();

    if (existingProfileError || !existingProfile) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);
    const isHardDelete = request.nextUrl.searchParams.get('hard') === 'true';

    if (isHardDelete) {
      // 1. Permanently delete from auth (and by cascade from profiles)
      const { error: hardDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (hardDeleteError) throw hardDeleteError;

      return NextResponse.json({ success: true, message: 'Staff permanently deleted' });
    } else {
      // 2. Soft delete (Default)
      const { error: softDeleteError } = await supabaseAdmin
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (softDeleteError) throw softDeleteError;

      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {
          ...(targetUser.user?.user_metadata || {}),
          blocked: true,
        },
      });

      return NextResponse.json({ success: true, message: 'Staff archived successfully' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete staff member', error);
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 });
  }
}
