import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * SOFT DELETE: Marks the account for deletion by setting deleted_at = NOW()
 * The user has 30 days to log back in and restore the account.
 */
export async function POST() {
  try {
    const supabase = await createServerClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark as deleted
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update Error:', updateError);
      return NextResponse.json({ error: 'Failed to mark account for deletion' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account marked for deletion' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
