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
      .from('cms_pages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch CMS pages', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to load CMS pages', error);
    return NextResponse.json({ error: 'Failed to load CMS pages' }, { status: 500 });
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

    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('cms_pages')
      .insert([
        {
          title: body.title,
          slug: body.slug,
          content: body.content || '',
          status: body.status || 'draft',
          author_id: authResult.user?.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create CMS page', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create CMS page', error);
    return NextResponse.json({ error: 'Failed to create CMS page' }, { status: 500 });
  }
}
