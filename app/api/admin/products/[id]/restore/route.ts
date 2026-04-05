import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getClient();

    // 1. Fetch the product to log its name
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Clear deleted_at and set is_active to true
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        deleted_at: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to restore product', updateError);
      return NextResponse.json({ error: 'Failed to restore product' }, { status: 500 });
    }

    // 3. Log the restore action
    await supabaseAdmin
      .from('audit_logs')
      .insert([
        {
          actor_id: authResult.user?.id,
          target_id: id,
          target_type: 'product',
          action: 'restore',
          metadata: { product_name: product.name }
        },
      ]);

    return NextResponse.json({ message: 'Product restored successfully' });
  } catch (error) {
    console.error('Failed to restore product', error);
    return NextResponse.json({ error: 'Failed to restore product' }, { status: 500 });
  }
}
