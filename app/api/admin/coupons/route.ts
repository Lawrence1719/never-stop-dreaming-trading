import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { CouponSchema } from '@/lib/validators/coupon';

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

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // 'active', 'inactive', 'expired'

    let query = supabaseAdmin
      .from('coupons')
      .select('*', { count: 'exact' });

    if (status === 'active') {
      query = query.eq('status', 'active').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    } else if (status === 'inactive') {
      query = query.eq('status', 'inactive');
    } else if (status === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Compute status as 'expired' or 'upcoming' on the fly if needed
    const now = new Date();
    const processedData = (data || []).map(coupon => {
      let currentStatus = coupon.status;
      if (coupon.status === 'active') {
        if (coupon.expires_at && new Date(coupon.expires_at) < now) {
          currentStatus = 'expired';
        } else if (coupon.starts_at && new Date(coupon.starts_at) > now) {
          currentStatus = 'upcoming';
        }
      }
      return { ...coupon, computed_status: currentStatus };
    });

    return NextResponse.json({
      data: processedData,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('[CouponsAPI] GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
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
    const validatedData = CouponSchema.parse(body);

    const supabaseAdmin = getClient();

    // Check code uniqueness
    const { data: existing } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .eq('code', validatedData.code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert([validatedData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('[CouponsAPI] POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
