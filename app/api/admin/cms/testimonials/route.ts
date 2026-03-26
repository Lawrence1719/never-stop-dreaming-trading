import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();
    const { data, error } = await supabaseAdmin
      .from('cms_testimonials')
      .select(`
        *,
        product:products(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch CMS testimonials', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to load CMS testimonials', error);
    return NextResponse.json({ error: 'Failed to load CMS testimonials' }, { status: 500 });
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

    if (!body.name || !body.rating || !body.comment) {
      return NextResponse.json(
        { error: 'Missing required fields: name, rating, comment' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('cms_testimonials')
      .insert([
        {
          name: body.name,
          email: body.email || null,
          rating: body.rating,
          comment: body.comment,
          product_id: body.product_id || null,
          status: body.status || 'pending',
          date: body.date || new Date().toISOString().split('T')[0],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create CMS testimonial', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create CMS testimonial', error);
    return NextResponse.json({ error: 'Failed to create CMS testimonial' }, { status: 500 });
  }
}
