import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CouponValidateSchema } from '@/lib/validators/coupon';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, cart_total } = CouponValidateSchema.parse(body);

    // 1. Fetch Coupon
    const { data: coupon, error: fetchError } = await supabaseClient
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (fetchError || !coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    // 2. Validate Status
    if (coupon.status !== 'active') {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 });
    }

    // 3. Validate Dates
    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return NextResponse.json({ error: 'This coupon is not yet active' }, { status: 400 });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    // 4. Validate Min Purchase
    if (cart_total < coupon.min_purchase) {
      return NextResponse.json({ 
        error: `Minimum purchase of ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(coupon.min_purchase)} required` 
      }, { status: 400 });
    }

    // 5. Validate Usage Limit
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ error: 'Coupon usage limit has been reached' }, { status: 400 });
    }

    // 6. Validate Per-User Limit
    const { count: userUsageCount, error: countError } = await supabaseClient
      .from('coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id);

    if (countError) throw countError;

    if (userUsageCount !== null && userUsageCount >= coupon.per_user_limit) {
      return NextResponse.json({ error: 'You have reached the usage limit for this coupon' }, { status: 400 });
    }

    // 7. Calculate Discount
    let discount_amount = 0;
    if (coupon.type === 'percentage') {
      discount_amount = cart_total * (coupon.discount_value / 100);
    } else if (coupon.type === 'fixed') {
      discount_amount = Math.min(coupon.discount_value, cart_total);
    } else if (coupon.type === 'free_shipping') {
      discount_amount = 0; // Shipping handled at order level
    }

    const new_total = Math.max(cart_total - discount_amount, 0);

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount_value: coupon.discount_value,
      discount_amount,
      new_total
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('[CouponValidateAPI] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
