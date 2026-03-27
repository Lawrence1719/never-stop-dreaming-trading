import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export async function GET(
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

    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to load profile', profileError);
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
    
    // Fetch customer profile
    const { data: customerProfile, error: customerError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, phone, role, created_at')
      .eq('id', id)
      .single();

    if (customerError || !customerProfile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch email from auth.users
    let email = '';
    try {
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (!usersError) {
        const authUser = users?.find((u) => u.id === id);
        email = authUser?.email || '';
      }
    } catch (err) {
      console.error('Error fetching user email:', err);
    }

    // Fetch order history
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Failed to fetch order history', ordersError);
    }

    const orderHistory = (orders || []).map((order: any) => ({
      id: order.id,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
    }));

    const totalSpent = (orders || []).reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);

    // Get blocked status from auth.users metadata
    let isBlocked = false;
    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (!authError && authUser?.user) {
        isBlocked = authUser.user.user_metadata?.blocked === true;
      }
    } catch (err) {
      console.error('Error fetching blocked status:', err);
    }

    return NextResponse.json({
      data: {
        id: customerProfile.id,
        name: customerProfile.name,
        email,
        phone: customerProfile.phone,
        role: customerProfile.role,
        status: isBlocked ? 'blocked' : 'active',
        joinDate: customerProfile.created_at,
        orders: orderHistory.length,
        totalSpent,
        orderHistory,
      },
    });
  } catch (error) {
    console.error('Failed to fetch customer details', error);
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json();
    
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
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (!usersError) {
        const targetUser = users?.find((u) => u.id === id);
        targetEmail = targetUser?.email || '';
      }
    } catch (err) {
      console.error('Error checking target user:', err);
    }

    const targetIsSuperAdmin = superAdminEmail && targetEmail === superAdminEmail;
    
    // Only super admin can modify super admin accounts
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot modify super admin account' }, { status: 403 });
    }
    
    // Update customer profile (name, phone)
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update customer', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Prevent deleting yourself
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if target is super admin
    const supabaseAdmin = getClient();
    let targetEmail = '';
    try {
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (!usersError) {
        const targetUser = users?.find((u) => u.id === id);
        targetEmail = targetUser?.email || '';
      }
    } catch (err) {
      console.error('Error checking target user:', err);
    }

    const targetIsSuperAdmin = superAdminEmail && targetEmail === superAdminEmail;
    
    // Only super admin can delete super admin accounts
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot delete super admin account' }, { status: 403 });
    }
    
    // Fetch customer name for notification before deletion
    const { data: profileToDelete } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', id)
      .single();

    // Delete user from auth.users (this will cascade delete profile due to ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Trigger notification
    if (profileToDelete) {
      try {
        const { notifyDeletedUser } = await import('@/lib/notifications/service');
        await notifyDeletedUser(profileToDelete.name);
      } catch (notifErr) {
        console.error('Failed to trigger customer deletion notification:', notifErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete customer', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}

