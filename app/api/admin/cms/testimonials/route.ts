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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const supabaseAdmin = getClient();

    if (!body.name || body.rating === undefined || body.rating === null || !body.comment) {
      return NextResponse.json(
        { error: 'Missing required fields: name, rating, comment' },
        { status: 400 }
      );
    }

    // Validate rating range and type
    if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate status
    const allowedStatuses = ['pending', 'published', 'archived'];
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('cms_testimonials')
      .insert([
        {
          name: body.name,
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
