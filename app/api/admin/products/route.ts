import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

async function verifyAdminAuth(token: string | null) {
  if (!token) {
    return { error: 'Unauthorized', status: 401, user: null };
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return { error: 'Unauthorized', status: 401, user: null };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return { error: 'Forbidden', status: 403, user: null };
    }

    return { error: null, status: 200, user };
  } catch (err) {
    return { error: 'Unauthorized', status: 401, user: null };
  }
}

// Generate a SKU from category + name and a numeric suffix ensuring uniqueness.
async function generateSKU(name?: string, category?: string, supabaseAdmin?: any) {
  // Short category code: first 2 alphanumeric chars
  const catCode = category
    ? (String(category).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 2) || 'CT')
    : 'CT';

  // Short name code: prefer initials from up to 3 words, otherwise first 3 letters
  const nameCode = (() => {
    if (!name) return 'PRD';
    const cleaned = String(name).trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return words
        .slice(0, 3)
        .map((w) => w[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 3);
    }
    const compact = cleaned.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return compact.slice(0, 3) || 'PRD';
  })();

  const prefix = `${catCode}-${nameCode}`;

  // Find existing SKUs that start with this prefix to determine the next number
  let maxNum = 0;
  try {
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('sku')
      .ilike('sku', `${prefix}-%`);

    if (Array.isArray(existing)) {
      for (const row of existing) {
        const val = row.sku || '';
        const parts = String(val).split('-');
        const last = parts[parts.length - 1];
        const num = parseInt(last, 10);
        if (!Number.isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  } catch (e) {
    // If any error occurs, fall back to timestamp/random approach
    const rand = Math.random().toString().substring(2, 6);
    return `${prefix}-${Date.now().toString().slice(-6)}${rand}`;
  }

  const next = maxNum + 1;
  const numStr = String(next).padStart(4, '0');
  return `${prefix}-${numStr}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';

    // Build query
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch products', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map the data to match the expected format
    const products = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku || '',
      category: row.category || '',
      price: `$${Number(row.price).toFixed(2)}`,
      stock: row.stock ?? 0,
      status: row.is_active ? 'active' : 'inactive',
    }));

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('Failed to load products', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const supabaseAdmin = getClient();

    // Validate required fields
    if (!body.name || !body.price || body.stock === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, stock' },
        { status: 400 }
      );
    }

    // Ensure we have a SKU; if not provided, generate one based on category+name and ensure uniqueness
    let sku = body.sku && String(body.sku).trim() !== '' ? String(body.sku).trim() : null;
    if (!sku) {
      sku = await generateSKU(body.name, body.category, supabaseAdmin);
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          name: body.name,
          sku: sku,
          description: body.description,
          category: body.category,
          price: parseFloat(body.price),
          stock: parseInt(body.stock),
          is_active: body.status === 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create product', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

