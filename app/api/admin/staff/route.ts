import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { resolveStaffRole, verifyStaffAccess, type StaffRole } from '@/lib/admin/staff';
import { sendStaffWelcomeEmail } from '@/lib/emails/profile-emails';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const authResult = await verifyStaffAccess(token, true);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
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
      .select('id, name, phone, role, created_at, deleted_at')
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

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const authUsersMap = new Map((users || []).map((user) => [user.id, user]));

    const staff = (profiles || [])
      .map((profile) => {
        const authUser = authUsersMap.get(profile.id);
        const role = authUser ? resolveStaffRole(authUser) : ('admin' as StaffRole);
        const isBlocked = authUser?.user_metadata?.blocked === true;

        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: authUser?.email || '',
          phone: profile.phone || '-',
          role,
          status: isBlocked ? 'inactive' : 'active',
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
  const authResult = await verifyStaffAccess(token, true);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { name, email, phone, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (role && !['admin', 'super_admin', 'courier'].includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role.' }, { status: 400 });
    }

    const normalizedRole: StaffRole = role === 'super_admin' ? 'super_admin' : 'admin';
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const supabaseAdmin = getClient();
    const {
      data: { user: createdUser },
      error: createError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        name: trimmedName,
        phone: trimmedPhone,
        role: role === 'courier' ? 'courier' : 'admin',
        isSuperAdmin: role === 'super_admin',
      },
    });

    if (createError || !createdUser) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create staff account' },
        { status: 500 }
      );
    }

    const emailResult = await sendStaffWelcomeEmail(normalizedEmail, trimmedName, normalizedRole);

    const staffPayload = {
      id: createdUser.id,
      name: trimmedName,
      email: normalizedEmail,
      phone: trimmedPhone,
      role: normalizedRole,
    };

    if (!emailResult.success) {
      const errMsg =
        emailResult.error instanceof Error
          ? emailResult.error.message
          : String(emailResult.error ?? 'Unknown error');
      console.error('[staff-welcome-email] Welcome email failed to send', {
        staffEmail: normalizedEmail,
        errorMessage: errMsg,
        rawError: emailResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      staff: staffPayload,
      ...(emailResult.success
        ? {}
        : {
            emailWarning:
              'Staff account created successfully but welcome email failed to send. Please notify the staff member manually.',
          }),
    });
  } catch (error) {
    console.error('Failed to create staff account', error);
    return NextResponse.json({ error: 'Failed to create staff account' }, { status: 500 });
  }
}
