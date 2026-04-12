import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { resolveStaffRole, verifyStaffAccess, type StaffRole } from '@/lib/admin/staff';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const authResult = await verifyStaffAccess(token, false);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Couriers cannot access staff management
  if (!authResult.isSuperAdmin && authResult.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'active';

  if (status === 'deleted' && !authResult.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabaseAdmin = getClient();

    let query = supabaseAdmin
      .from('profiles')
      .select('id, name, phone, email, role, created_at, deleted_at, invited_at, invitation_status, accepted_at')
      .in('role', ['admin', 'courier']);

    if (status === 'deleted') {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    const { data: profiles, error: profilesError } = await query
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const allAuthUsers: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = [];
    let authPage = 1;
    while (true) {
      const { data: { users: pageUsers }, error: usersError } =
        await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
      }
      if (!pageUsers || pageUsers.length === 0) break;
      allAuthUsers.push(...pageUsers);
      if (pageUsers.length < 1000) break;
      authPage++;
    }

    const authUsersMap = new Map(allAuthUsers.map((u) => [u.id, u]));

    const staff = (profiles || [])
      .map((profile) => {
        const authUser = authUsersMap.get(profile.id);
        const role = authUser ? resolveStaffRole(authUser) : (profile.role as StaffRole);
        const isBlocked = authUser?.user_metadata?.blocked === true;

        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || authUser?.email || '',
          phone: profile.phone || '-',
          role,
          status: isBlocked ? 'inactive' : 'active',
          invitation_status: profile.invitation_status || 'accepted',
          invited_at: profile.invited_at,
          accepted_at: profile.accepted_at,
          joinDate: profile.created_at,
          isCurrentUser: profile.id === authResult.user?.id,
          deletedAt: profile.deleted_at,
        };
      })
      .filter((member) => member.email);

    return NextResponse.json({
      data: staff,
      currentUser: {
        id: authResult.user.id,
        email: authResult.user.email,
        isSuperAdmin: authResult.isSuperAdmin,
      },
    });
  } catch (error) {
    console.error('Failed to load staff', error);
    return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const authResult = await verifyStaffAccess(token, false);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Couriers cannot access staff management
  if (!authResult.isSuperAdmin && authResult.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, email, phone, role } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    if (role && !['admin', 'super_admin', 'courier'].includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role.' }, { status: 400 });
    }

    if (!authResult.isSuperAdmin && role !== 'courier') {
      return NextResponse.json({ error: 'Admins can only create Courier accounts.' }, { status: 403 });
    }

    const normalizedRole: StaffRole = role === 'courier' ? 'courier' : role === 'super_admin' ? 'super_admin' : 'admin';
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';

    const supabaseAdmin = getClient();
    
    // Use Supabase invite flow
    const {
      data: { user: invitedUser },
      error: inviteError,
    } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/staff/accept-invite`,
      data: {
        name: trimmedName,
        phone: trimmedPhone,
        role: normalizedRole,
        isSuperAdmin: normalizedRole === 'super_admin',
      },
    });

    if (inviteError || !invitedUser) {
      return NextResponse.json(
        { error: inviteError?.message || 'Failed to invite staff member' },
        { status: 500 }
      );
    }

    // Upsert into profiles table with pending status
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: invitedUser.id,
      name: trimmedName,
      email: normalizedEmail,
      phone: trimmedPhone,
      role: normalizedRole,
      invitation_status: 'pending',
      invited_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Failed to create/update profile for invited user', profileError);
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'staff_invited',
      target_type: 'user',
      target_id: invitedUser.id,
      metadata: { 
        role: normalizedRole, 
        invited_by: authResult.user.id, 
        inviter_role: authResult.isSuperAdmin ? 'super_admin' : 'admin' 
      }
    });

    const staffPayload = {
      id: invitedUser.id,
      name: trimmedName,
      email: normalizedEmail,
      phone: trimmedPhone,
      role: normalizedRole,
      invitation_status: 'pending',
    };

    return NextResponse.json({
      success: true,
      staff: staffPayload,
    });
  } catch (error) {
    console.error('Failed to invite staff account', error);
    return NextResponse.json({ error: 'Failed to invite staff account' }, { status: 500 });
  }
}
