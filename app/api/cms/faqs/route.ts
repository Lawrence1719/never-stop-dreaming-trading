import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getClient();
    const { data, error } = await supabaseAdmin
      .from('cms_faqs')
      .select('question, answer, category')
      .eq('status', 'published')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch public CMS FAQs', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to load public CMS FAQs', error);
    return NextResponse.json({ error: 'Failed to load public CMS FAQs' }, { status: 500 });
  }
}
