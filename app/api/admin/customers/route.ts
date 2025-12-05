import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasAnonKey: !!supabaseAnonKey 
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to load profile for customers', profileError);
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 });
    }

    // Check if user is super admin via env var or has admin role in database
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
    const isSuperAdmin = superAdminEmail && user.email === superAdminEmail;
    const isAdmin = profile?.role === 'admin' || isSuperAdmin;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client for data fetching
    const supabaseAdmin = getClient();
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Fetch all profiles
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('id, name, phone, role, created_at')
      .order('created_at', { ascending: false });

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('Failed to fetch profiles', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get all user IDs
    const userIds = (profiles || []).map((p: any) => p.id);

    // Fetch emails from auth.users
    let emailsMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      try {
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) {
          console.error('Failed to fetch user emails', usersError);
        } else {
          emailsMap = (users || []).reduce((acc, user) => {
            if (userIds.includes(user.id)) {
              acc[user.id] = user.email || null;
            }
            return acc;
          }, {} as Record<string, string | null>);
        }
      } catch (err) {
        console.error('Error fetching user emails:', err);
      }
    }

    // Fetch order statistics for each customer
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('user_id, total, status');

    if (ordersError) {
      console.error('Failed to fetch orders for customer stats', ordersError);
    }

    // Calculate order stats per customer
    const orderStats: Record<string, { count: number; total: number }> = {};
    (ordersData || []).forEach((order: any) => {
      if (!order.user_id) return;
      if (!orderStats[order.user_id]) {
        orderStats[order.user_id] = { count: 0, total: 0 };
      }
      orderStats[order.user_id].count += 1;
      orderStats[order.user_id].total += Number(order.total || 0);
    });

    // Get blocked status from auth.users metadata
    let blockedUsersMap: Record<string, boolean> = {};
    if (userIds.length > 0) {
      try {
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        if (!usersError) {
          blockedUsersMap = (users || []).reduce((acc, user) => {
            if (userIds.includes(user.id)) {
              acc[user.id] = user.user_metadata?.blocked === true;
            }
            return acc;
          }, {} as Record<string, boolean>);
        }
      } catch (err) {
        console.error('Error fetching blocked status:', err);
      }
    }

    // Map the data to match the expected format
    const customers = (profiles || [])
      .map((profile: any) => {
        const stats = orderStats[profile.id] || { count: 0, total: 0 };
        const email = emailsMap[profile.id] || '';
        const isBlocked = blockedUsersMap[profile.id] || false;
        const isProfileSuperAdmin = superAdminEmail && email === superAdminEmail;
        
        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email,
          phone: profile.phone || '-',
          orders: stats.count,
          totalSpent: stats.total,
          status: isBlocked ? 'blocked' : 'active',
          joinDate: new Date(profile.created_at).toISOString().split('T')[0],
          role: profile.role || 'customer',
          isSuperAdmin: isProfileSuperAdmin,
          isSuperAdmin: isProfileSuperAdmin,
        };
      })
      .filter((customer: any) => {
        // Apply search filter
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower)
        );
      })
      .filter((customer: any) => {
        // Apply status filter
        if (status === 'all') return true;
        return customer.status === status;
      });

    return NextResponse.json({ 
      data: customers,
      currentUser: {
        id: user.id,
        email: user.email,
        isSuperAdmin,
      }
    });
  } catch (error) {
    console.error('Failed to load customers', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

