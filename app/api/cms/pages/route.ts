import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getClient();
    const { data, error } = await supabaseAdmin
      .from('cms_pages')
      .select('title, slug, content')
      .eq('status', 'published');

    if (error) {
      console.error('Failed to fetch public CMS pages', error);
      return NextResponse.json({ error: 'Failed to load public CMS pages' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to load public CMS pages', error);
    return NextResponse.json({ error: 'Failed to load public CMS pages' }, { status: 500 });
  }
}
