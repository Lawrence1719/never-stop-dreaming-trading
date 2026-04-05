import { getClient } from '@/lib/supabase/admin';

export type StaffRole = 'admin' | 'super_admin' | 'courier';

export function isSuperAdminIdentity(user: {
  email?: string | null;
  user_metadata?: Record<string, any> | null;
}) {
  const configuredEmail = process.env.SUPER_ADMIN_EMAIL || '';
  const metadataFlag = user.user_metadata?.isSuperAdmin === true;
  const configuredFlag = !!(configuredEmail && user.email === configuredEmail);

  return metadataFlag || configuredFlag;
}

export function resolveStaffRole(user: {
  email?: string | null;
  user_metadata?: Record<string, any> | null;
}) {
  if (isSuperAdminIdentity(user)) return 'super_admin';
  if (user.user_metadata?.role === 'courier') return 'courier';
  return 'admin';
}

export async function verifyStaffAccess(token: string | null, requireSuperAdmin = false) {
  if (!token) {
    return { error: 'Unauthorized', status: 401, user: null, isSuperAdmin: false };
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return { error: 'Unauthorized', status: 401, user: null, isSuperAdmin: false };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single();

    if (profileError || !['admin', 'courier'].includes(profile?.role || '')) {
      return { error: 'Forbidden', status: 403, user: null, isSuperAdmin: false };
    }

    const isSuperAdmin = isSuperAdminIdentity(user);

    if (requireSuperAdmin && !isSuperAdmin) {
      return { error: 'Forbidden', status: 403, user: null, isSuperAdmin: false };
    }

    return { error: null, status: 200, user, profile, isSuperAdmin };
  } catch (error) {
    return { error: 'Unauthorized', status: 401, user: null, isSuperAdmin: false };
  }
}
