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
      .select('id, name, phone, role, created_at, deleted_at')
      .eq('id', id)
      .single();

    if (customerError || !customerProfile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch email from auth.users — direct O(1) look-up by ID.
    let email = '';
    try {
      const { data: authUser, error: emailError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (!emailError && authUser?.user) {
        email = authUser.user.email || '';
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
        status: customerProfile.deleted_at ? 'deleted' : isBlocked ? 'blocked' : 'active',
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
    // Fetch target user’s email via direct look-up — replaces listUsers() scan.
    let targetEmail = '';
    try {
      const { data: authUser, error: targetEmailError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (!targetEmailError && authUser?.user) {
        targetEmail = authUser.user.email || '';
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

/**
 * ADMIN RESTORE
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const supabaseAdmin = getClient();
    
    // Auth check (ensure requester is admin)
    const { data: { user: actor }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', actor.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Restore
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', id);

    if (updateError) throw updateError;

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: actor.id,
      target_id: id,
      target_type: 'profile',
      action: 'restore',
      metadata: { source: 'admin_action' }
    });

    return NextResponse.json({ success: true, message: 'Customer restored successfully' });
  } catch (error: any) {
    console.error('Failed to restore customer', error);
    return NextResponse.json({ error: error.message || 'Failed to restore customer' }, { status: 500 });
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
    // Fetch target user for super-admin guard — direct look-up by ID.
    let targetEmail = '';
    try {
      const { data: authUser, error: targetEmailError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (!targetEmailError && authUser?.user) {
        targetEmail = authUser.user.email || '';
      }
    } catch (err) {
      console.error('Error checking target user:', err);
    }

    const targetIsSuperAdmin = superAdminEmail && targetEmail === superAdminEmail;
    
    // Only super admin can delete super admin accounts
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot delete super admin account' }, { status: 403 });
    }
    
    // Fetch customer name for notification before actions
    const { data: profileToDelete } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', id)
      .single();

    const { notifyDeletedUser } = await import('@/lib/notifications/service');
    const isHardDelete = request.nextUrl.searchParams.get('hard') === 'true';

    if (isHardDelete) {
      // HARD DELETE: Remove everything in correct order to respect FKs
      // 1. Collect dependent IDs
      const { data: userOrders } = await supabaseAdmin.from('orders').select('id, status').eq('user_id', id);
      const allOrderIds = (userOrders || []).map(o => o.id);
      const activeOrderIds = (userOrders || [])
        .filter(o => !['delivered', 'failed', 'cancelled'].includes(o.status))
        .map(o => o.id);

      // 2. Cleanup courier assignments for ALL user orders first
      if (allOrderIds.length > 0) {
        await supabaseAdmin.from('courier_deliveries').delete().in('order_id', allOrderIds);
      }

      // 3. For active orders, set status to cancelled and clear courier_id before they are eventually deleted
      // (Even if they are deleted, setting them to cancelled and clearing the courier link is safer)
      if (activeOrderIds.length > 0) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelled', courier_id: null })
          .in('id', activeOrderIds);
      }

      // 4. Delete child records
      const cleanupTasks = [
        supabaseAdmin.from('cart').delete().eq('user_id', id),
        supabaseAdmin.from('wishlist').delete().eq('user_id', id),
        supabaseAdmin.from('reviews').delete().eq('user_id', id),
        supabaseAdmin.from('notifications').delete().eq('user_id', id),
        supabaseAdmin.from('audit_logs').delete().or(`actor_id.eq.${id},target_id.eq.${id}`),
      ];

      if (allOrderIds.length > 0) {
        cleanupTasks.push(supabaseAdmin.from('order_items').delete().in('order_id', allOrderIds));
        cleanupTasks.push(supabaseAdmin.from('order_status_history').delete().in('order_id', allOrderIds));
      }

      await Promise.all(cleanupTasks);

      // 5. Delete secondary parent records
      if (allOrderIds.length > 0) {
        await supabaseAdmin.from('orders').delete().eq('user_id', id);
      }
      
      // 4. Delete the profile (usually has a FK to auth.users)
      await supabaseAdmin.from('profiles').delete().eq('id', id);

      // 5. Finally, remove the auth user
      const { error: hardDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (hardDeleteError) throw hardDeleteError;

      // Audit Log for Hard Delete
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        target_id: id,
        target_type: 'profile',
        action: 'hard_delete',
        metadata: { source: 'admin_action' }
      });

      if (profileToDelete) await notifyDeletedUser(`${profileToDelete.name} (Permanently Deleted)`);
      return NextResponse.json({ success: true, message: 'Customer permanently deleted' });
    } else {
      // SOFT DELETE: Archive
      const deletedAt = new Date().toISOString();
      const { error: softDeleteError } = await supabaseAdmin
        .from('profiles')
        .update({ deleted_at: deletedAt })
        .eq('id', id);

      if (softDeleteError) throw softDeleteError;

      // Audit Log for Soft Delete
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        target_id: id,
        target_type: 'profile',
        action: 'soft_delete',
        metadata: { source: 'admin_action' }
      });

      if (profileToDelete) await notifyDeletedUser(profileToDelete.name);
      return NextResponse.json({ success: true, message: 'Customer archived successfully' });
    }
  } catch (error: any) {
    console.error('Failed to delete/archive customer', error);
    return NextResponse.json({ error: error.message || 'Failed to delete customer' }, { status: 500 });
  }
}
