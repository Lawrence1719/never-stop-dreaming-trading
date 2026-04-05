import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    const supabaseAdmin = getClient();

    // 1. Resolve user: prefer Bearer (matches client fetch) so this works without cookie session in the handler
    let user: { id: string } | null = null;
    if (bearer) {
      const { data: { user: u }, error: bearerErr } = await supabaseAdmin.auth.getUser(bearer);
      if (!bearerErr && u) user = u;
    }
    if (!user) {
      const supabase = await createServerClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) user = cookieUser;
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify Role (Courier or Admin) — admin client so RLS is not required when only Bearer was sent
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'courier' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch global order sequence using admin client (bypasses RLS)
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
