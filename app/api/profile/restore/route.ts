import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * RESTORE: Cancels a pending account deletion by setting deleted_at = NULL.
 */
export async function POST() {
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

    return NextResponse.json({ success: true, message: 'Account restored successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
