import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, fullName } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getClient();

    // Check if already subscribed
    const { data: existing, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking subscription:', checkError);
      return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
    }

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
      } else {
        // Re-activate
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({ 
            is_active: true, 
            ...(fullName && { full_name: fullName })
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }
        return NextResponse.json({ message: 'Subscription re-activated' }, { status: 200 });
      }
    }

    // New subscription
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        full_name: fullName || null,
        is_active: true
      });

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Successfully subscribed' }, { status: 201 });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
