import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

async function verifyAdmin() {
  const supabase = await createServerClient();
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Unauthorized', status: 401, user: null, isSuperAdmin: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden', status: 403, user: null, isSuperAdmin: false };
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
  const isSuperAdmin = !!(superAdminEmail && user.email === superAdminEmail);

  return { error: null, status: 200, user, isSuperAdmin, superAdminEmail };
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin();
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const role = searchParams.get('role') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const allowedRoles = ['customer'] as const;
    const normalizedRoleFilter = role === 'customer' ? role : 'all';

    let query = supabaseAdmin
      .from('profiles')
      .select('id, name, phone, role, created_at, deleted_at')
      .in('role', allowedRoles);

    if (status === 'deleted') {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    let { data: allProfiles, error: profilesError } = await query
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Failed to fetch profiles', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch emails and metadata from auth.users with pagination to avoid silent
    // truncation at 1000 users (Supabase listUsers default).
    const emailsMap: Record<string, string> = {};
    const blockedMap: Record<string, boolean> = {};
    let authPage = 1;
    while (true) {
      const { data: { users: pageUsers }, error: usersError } =
        await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
      if (usersError || !pageUsers || pageUsers.length === 0) break;
      pageUsers.forEach(u => {
        emailsMap[u.id] = u.email || '';
        blockedMap[u.id] = u.user_metadata?.blocked === true;
      });
      if (pageUsers.length < 1000) break;
      authPage++;
    }

    // Fetch order stats
    const { data: ordersData } = await supabaseAdmin.from('orders').select('user_id, total');
    const orderStats: Record<string, { count: number; total: number }> = {};
    (ordersData || []).forEach(order => {
      if (!order.user_id) return;
      const stats = orderStats[order.user_id] || { count: 0, total: 0 };
      stats.count += 1;
      stats.total += Number(order.total || 0);
      orderStats[order.user_id] = stats;
    });

    const superAdminEmail = authResult.superAdminEmail;

    // Map and Filter ALL customers
    const allCustomers = (allProfiles || []).map((p: any) => {
      const email = emailsMap[p.id] || '';
      const isBlocked = blockedMap[p.id] || false;
      const stats = orderStats[p.id] || { count: 0, total: 0 };
      const role = 'customer';
      const isSuperAdmin = !!(superAdminEmail && email === superAdminEmail);

      return {
        id: p.id,
        name: p.name || 'Unknown',
        email,
        phone: p.phone || '-',
        orders: stats.count,
        totalSpent: stats.total,
        status: p.deleted_at ? 'deleted' : isBlocked ? 'blocked' : 'active',
        joinDate: new Date(p.created_at).toISOString().split('T')[0],
        deletedAt: p.deleted_at,
        role,
        isSuperAdmin,
      };
    });

    // Apply filters
    const filteredCustomers = allCustomers.filter(customer => {
      if (customer.isSuperAdmin) return false;

      if (normalizedRoleFilter !== 'all' && customer.role !== normalizedRoleFilter) {
        return false;
      }

      // Status filter
      if (status !== 'all' && customer.status !== status) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.role.toLowerCase().includes(searchLower) ||
          customer.phone.includes(searchLower)
        );
      }
      return true;
    });

    const totalCount = filteredCustomers.length;
    const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedCustomers,
      totalCount,
      page,
      limit,
      currentUser: {
        id: authResult.user.id,
        email: authResult.user.email,
        isSuperAdmin: authResult.isSuperAdmin,
      },
    });
  } catch (error) {
    console.error('Failed to load customers', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin();
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { firstName, middleName, lastName, email, phone, password, role } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'First name, last name, email, and password are required.' },
        { status: 400 }
      );
    }

    const { validateName } = await import('@/lib/utils/validation');
    
    const firstNameValidation = validateName(firstName, 'First name');
    if (!firstNameValidation.valid) {
      return NextResponse.json({ error: firstNameValidation.error }, { status: 400 });
    }

    if (middleName) {
      const middleNameValidation = validateName(middleName, 'Middle name');
      if (!middleNameValidation.valid) {
        return NextResponse.json({ error: middleNameValidation.error }, { status: 400 });
      }
    }

    const lastNameValidation = validateName(lastName, 'Last name');
    if (!lastNameValidation.valid) {
      return NextResponse.json({ error: lastNameValidation.error }, { status: 400 });
    }

    const fullName = [firstName, middleName, lastName]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = 'customer';

    // Password validation (min 6 chars to match registration)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getClient();

    // Create auth user via admin API
    // We set email_confirm: false to match registration flow (requires verification)
    const {
      data: { user: createdUser },
      error: createError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        name: fullName,
        phone,
        role: normalizedRole,
      },
    });

    if (createError || !createdUser) {
      console.error('Failed to create customer user', createError);
      return NextResponse.json(
        { error: createError?.message || 'Failed to create customer user' },
        { status: 500 }
      );
    }

    // [REMOVED] Manual profile insertion - The DB trigger on_auth_user_created 
    // in 001_create_profiles_table.sql handles this automatically.

    // Trigger notification for admins
    try {
      const { notifyNewUser } = await import('@/lib/notifications/service');
      await notifyNewUser(fullName, createdUser.id);
    } catch (notifErr) {
      console.error('Failed to trigger customer notification:', notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: createdUser.id,
          name: fullName,
          email: createdUser.email,
          phone: phone || null,
          role: normalizedRole,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create customer', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
