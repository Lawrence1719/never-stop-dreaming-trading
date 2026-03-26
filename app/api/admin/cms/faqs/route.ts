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
      .from('cms_faqs')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch CMS FAQs', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to load CMS FAQs', error);
    return NextResponse.json({ error: 'Failed to load CMS FAQs' }, { status: 500 });
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

    if (!body.question || !body.answer) {
      return NextResponse.json(
        { error: 'Missing required fields: question, answer' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('cms_faqs')
      .insert([
        {
          question: body.question,
          answer: body.answer,
          category: body.category || 'General',
          status: body.status || 'draft',
          display_order: body.display_order || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create CMS FAQ', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create CMS FAQ', error);
    return NextResponse.json({ error: 'Failed to create CMS FAQ' }, { status: 500 });
  }
}
