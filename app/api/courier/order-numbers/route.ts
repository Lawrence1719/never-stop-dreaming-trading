import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 1. Verify Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify Role (Courier or Admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'courier' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch global order sequence using admin client (bypasses RLS)
    const supabaseAdmin = getClient();
    const { data: allOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[API] Failed to fetch global order sequences:', fetchError);
      return NextResponse.json({ error: 'Failed to calculate order sequences' }, { status: 500 });
    }

    // 4. Build sequence map: UUID -> Sequential number
    const sequenceMap: Record<string, number> = {};
    (allOrders || []).forEach((order: { id: string }, idx: number) => {
      sequenceMap[order.id] = idx + 1;
    });

    return NextResponse.json({ data: sequenceMap });
  } catch (error) {
    console.error('[API] Unexpected error in courier order-numbers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
