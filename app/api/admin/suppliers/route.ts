import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

async function verifyAdmin(token: string | null) {
  if (!token) return { error: 'Unauthorized', status: 401 };
  const admin = getClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 };
  return { error: null, status: 200, user };
}

// GET /api/admin/suppliers
export async function GET(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim() || null;
  const auth = await verifyAdmin(token);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getClient();
  const { data, error } = await admin
    .from('suppliers')
    .select('id, name, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/admin/suppliers
export async function POST(request: NextRequest) {
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
    .insert({ name: body.name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A supplier with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
