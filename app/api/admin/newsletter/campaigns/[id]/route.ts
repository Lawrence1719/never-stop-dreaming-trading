import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { subject, content, status } = await req.json();

    const supabase = getClient();

    const { data: campaign, error: updateError } = await supabase
      .from('newsletter_campaigns')
      .update({
        ...(subject && { subject }),
        ...(content && { content }),
        ...(status && { status }),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Admin campaign update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getClient();

    const { error: deleteError } = await supabase
      .from('newsletter_campaigns')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Admin campaign delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
