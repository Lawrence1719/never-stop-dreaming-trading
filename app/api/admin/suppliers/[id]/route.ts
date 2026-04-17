import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

async function verifyAdmin(token: string | null) {
  if (!token) return { error: 'Unauthorized', status: 401 };
  const admin = getClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 };
  return { error: null, status: 200 };
}

// PATCH /api/admin/suppliers/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim() || null;
  const auth = await verifyAdmin(token);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
  }

  const admin = getClient();
  const { data, error } = await admin
    .from('suppliers')
    .update({ name: body.name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A supplier with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// DELETE /api/admin/suppliers/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim() || null;
  const auth = await verifyAdmin(token);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getClient();

  // Check if supplier has products
  const { count } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this supplier has ${count} product(s) linked to it. Reassign them first.` },
      { status: 409 },
    );
  }

  const { error } = await admin.from('suppliers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
