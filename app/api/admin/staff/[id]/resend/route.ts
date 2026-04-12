import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { verifyStaffAccess, type StaffRole } from '@/lib/admin/staff';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const supabaseAdmin = getClient();
    
    // Get the user's current profile to get their email and role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, name, phone, role, invitation_status')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    if (profile.invitation_status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invitations can be resent.' }, { status: 400 });
    }

    // Admins can only resend invites to Couriers
    if (!authResult.isSuperAdmin && profile.role !== 'courier') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Re-invite using Supabase
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/staff/accept-invite`,
      data: {
        name: profile.name,
        phone: profile.phone,
        role: profile.role,
        isSuperAdmin: profile.role === 'super_admin',
      },
    });

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message || 'Failed to resend invitation' },
        { status: 500 }
      );
    }

    // Update invited_at timestamp
    await supabaseAdmin.from('profiles').update({
      invited_at: new Date().toISOString(),
    }).eq('id', id);

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'staff_invite_resent',
      target_type: 'user',
      target_id: id,
      metadata: { 
        role: profile.role, 
        resent_by: authResult.user.id, 
        inviter_role: authResult.isSuperAdmin ? 'super_admin' : 'admin' 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to resend staff invitation', error);
    return NextResponse.json({ error: 'Failed to resend staff invitation' }, { status: 500 });
  }
}
