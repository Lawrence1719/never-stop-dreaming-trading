import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * RESTORE: Cancels a pending account deletion by setting deleted_at = NULL.
 * Supports both POST (in-app button) and GET (one-click email link).
 */
export async function POST() {
  return handleRestore();
}

export async function GET(request: Request) {
  const result = await handleRestore();
  const url = new URL(request.url);
  
  if (result.status === 200) {
    // Redirect to home with success message
    return NextResponse.redirect(new URL('/?message=Account%20restored%20successfully', url.origin));
  } else {
    // Redirect to login or home with error
    return NextResponse.redirect(new URL('/login?error=Failed%20to%20restore%20account', url.origin));
  }
}

async function handleRestore() {
  try {
    const supabase = await createServerClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restore the account
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update Error:', updateError);
      return NextResponse.json({ error: 'Failed to restore account' }, { status: 500 });
    }

    // Record Audit Log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      target_id: user.id,
      target_type: 'profile',
      action: 'restore',
      metadata: { source: 'customer_self' }
    });

    return NextResponse.json({ success: true, message: 'Account restored successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
