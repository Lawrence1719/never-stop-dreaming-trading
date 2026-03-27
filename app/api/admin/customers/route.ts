import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { error: 'Unauthorized - No token provided', status: 401, user: null, isSuperAdmin: false };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });
    return { error: 'Server configuration error', status: 500, user: null, isSuperAdmin: false };
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
    return { error: 'Unauthorized - Invalid token', status: 401, user: null, isSuperAdmin: false };
  }

  const { data: profile, error: profileError } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to load profile for customers', profileError);
    return { error: 'Unable to verify user role', status: 500, user: null, isSuperAdmin: false };
  }

  // Check if user is super admin via env var or has admin role in database
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
  const isSuperAdmin = !!(superAdminEmail && user.email === superAdminEmail);
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  if (!isAdmin) {
    return { error: 'Forbidden', status: 403, user: null, isSuperAdmin: false };
  }

  return { error: null, status: 200, user, isSuperAdmin, superAdminEmail };
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request);
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch all profiles to allow cross-field filtering (since email/stats/blocked are external)
    let { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, phone, role, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Failed to fetch profiles', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get all user IDs
    const userIds = (allProfiles || []).map((p: any) => p.id);

    // Fetch emails and metadata from auth.users (requires service role)
    const { data: { users: authUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    const emailsMap: Record<string, string> = {};
    const blockedMap: Record<string, boolean> = {};
    
    if (!usersError) {
      authUsers.forEach(user => {
        emailsMap[user.id] = user.email || '';
        blockedMap[user.id] = user.user_metadata?.blocked === true;
      });
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
      const role = p.role || 'customer';
      const isSuperAdmin = superAdminEmail && email === superAdminEmail;

      return {
        id: p.id,
        name: p.name || 'Unknown',
        email,
        phone: p.phone || '-',
        orders: stats.count,
        totalSpent: stats.total,
        status: isBlocked ? 'blocked' : 'active',
        joinDate: new Date(p.created_at).toISOString().split('T')[0],
        role,
        isSuperAdmin,
      };
    });

    // Apply filters
    const filteredCustomers = allCustomers.filter(customer => {
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
  const authResult = await verifyAdmin(request);
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

    const fullName = [firstName, middleName, lastName]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role === 'admin' ? 'admin' : 'customer';

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
