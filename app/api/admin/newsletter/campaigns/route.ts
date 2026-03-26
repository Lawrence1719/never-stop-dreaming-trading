import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = getClient();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const { data: campaigns, error: fetchError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Error fetching campaigns:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Get total subscribers count for the stats
    const { count: totalSubscribers, error: countError } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting subscribers:', countError);
    }

    return NextResponse.json({
      campaigns,
      stats: {
        totalSubscribers: totalSubscribers || 0,
        // Mocking rates for now as we don't have tracking setup yet
        avgOpenRate: '28.1%', 
        avgClickRate: '12.0%',
        activeCampaigns: campaigns.filter(c => c.status === 'sent').length
      }
    });
  } catch (error) {
    console.error('Admin campaigns fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subject, content } = await req.json();

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
    }

    const supabase = getClient();

    const { data: campaign, error: insertError } = await supabase
      .from('newsletter_campaigns')
      .insert({
        subject,
        content,
        status: 'draft'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating campaign:', insertError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Admin campaign create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
