import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { rateLimiters, getIdentifier, rateLimitResponse } from '@/lib/rate-limit';

/**
 * SOFT DELETE: Marks the account for deletion by setting deleted_at = NOW()
 * The user has 30 days to log back in and restore the account.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = getIdentifier(request, user.id);
    try {
      const { success, reset } = await rateLimiters.user.limit(identifier);
      if (!success) return rateLimitResponse(reset);
    } catch (err) {
      console.error('[RateLimit] Redis unavailable, failing open:', err);
    }

    // Mark as deleted
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('name, email')
      .single();

    if (profileError || !profile) {
      console.error('Update Error:', profileError);
      return NextResponse.json({ error: 'Failed to mark account for deletion' }, { status: 500 });
    }

    // Record Audit Log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      target_id: user.id,
      target_type: 'profile',
      action: 'soft_delete',
      metadata: { source: 'customer_self' }
    });

    // Send Deletion Requested Email
    try {
      const { sendDeletionRequestedEmail } = await import('@/lib/email/service');
      await sendDeletionRequestedEmail(profile.email || user.email || '', profile.name);
    } catch (emailErr) {
      console.error('Failed to send deletion confirmation email:', emailErr);
    }

    return NextResponse.json({ success: true, message: 'Account marked for deletion' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
