import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { notifyIfVariantLowStock } from '@/lib/notifications/service';

async function verifyAdminAuth(token: string | null) {
  if (!token) {
    return { error: 'Unauthorized', status: 401, user: null };
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return { error: 'Unauthorized', status: 401, user: null };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return { error: 'Forbidden', status: 403, user: null };
    }

    return { error: null, status: 200, user };
  } catch (err) {
    return { error: 'Unauthorized', status: 401, user: null };
  }
}

/**
 * GET /api/admin/products/variants/[id]
 * Fetch a single variant by ID
 */
export async function GET(
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

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch variant', error);
    return NextResponse.json({ error: 'Failed to fetch variant' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/products/variants/[id]
 * Update a product variant
 */
export async function PUT(
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
    const body = await request.json();
    const supabaseAdmin = getClient();

    // Check if variant exists
    const { data: existingVariant, error: fetchError } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingVariant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    // If SKU is being changed, check for uniqueness
    if (body.sku && body.sku !== existingVariant.sku) {
      const { data: duplicateSku } = await supabaseAdmin
        .from('product_variants')
        .select('id')
        .eq('sku', body.sku)
        .neq('id', id)
        .single();

      if (duplicateSku) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    // Build update object (only include fields that are provided)
    const updateData: any = {};
    if (body.variant_label !== undefined) updateData.variant_label = body.variant_label;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.item_code !== undefined) updateData.item_code = body.item_code;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.doz_pckg !== undefined) updateData.doz_pckg = body.doz_pckg;
    if (body.reorder_threshold !== undefined) updateData.reorder_threshold = body.reorder_threshold;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update variant', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger low stock notification check if stock or threshold was updated
    if (body.stock !== undefined || body.reorder_threshold !== undefined) {
      notifyIfVariantLowStock(id).catch(err => 
        console.error(`[VariantAPI] Failed to trigger stock check for ${id}:`, err)
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to update variant', error);
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/variants/[id]
 * Delete a product variant (soft delete via is_active)
 */
export async function DELETE(
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

    // Check if variant exists
    const { data: existingVariant, error: fetchError } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingVariant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    // Hard delete the variant
    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to delete variant', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to delete variant', error);
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 });
  }
}
