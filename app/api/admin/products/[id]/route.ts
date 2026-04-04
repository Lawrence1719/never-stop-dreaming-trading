import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/admin/auth';

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
      .from('products')
      .select('*, product_images(*), product_variants(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch product', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: name' },
        { status: 400 }
      );
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .update({
        name: body.name,
        description: body.description,
        category: body.category,
        is_active: body.status === 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      console.error('Failed to update product', productError);
      return NextResponse.json({ 
        error: 'Failed to update product',
        details: productError.message 
      }, { status: 500 });
    }

    // Sync product images using a safer 'Insert then Delete' pattern
    if (body.product_images && Array.isArray(body.product_images)) {
      try {
        // 1. Fetch existing image IDs
        const { data: existingImages } = await supabaseAdmin
          .from('product_images')
          .select('id')
          .eq('product_id', id);
        
        const oldImageIds = (existingImages || []).map(img => img.id);

        // 2. Insert new images
        if (body.product_images.length > 0) {
          const imagesToInsert = body.product_images.map((img: any, index: number) => {
            if (!img.storage_path) {
              throw new Error(`Image at index ${index} is missing storage_path`);
            }
            return {
              product_id: id,
              storage_path: img.storage_path,
              sort_order: img.sort_order ?? index,
              is_primary: img.is_primary || false,
            };
          });

          const { error: insertError } = await supabaseAdmin
            .from('product_images')
            .insert(imagesToInsert);

          if (insertError) {
            throw new Error(`Failed to insert new images: ${insertError.message}`);
          }
        }

        // 3. Only if insert succeeded, delete the old images
        if (oldImageIds.length > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from('product_images')
            .delete()
            .in('id', oldImageIds);

          if (deleteError) {
            console.warn('New images inserted, but failed to clear old ones:', deleteError.message);
            // We don't throw here to avoid failing the whole product update,
            // as new images are already safely in.
          }
        }
      } catch (imageErr: any) {
        console.error('Failed to sync product images', imageErr);
        throw imageErr;
      }
    }

    // Handle variant pricing/inventory update if provided
    if (body.sku || body.price !== undefined || body.stock !== undefined) {
      try {
        const { data: variants } = await supabaseAdmin
          .from('product_variants')
          .select('id')
          .eq('product_id', id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (variants && variants.length > 0) {
          // Update existing variant
          const updateObj: any = { updated_at: new Date().toISOString() };
          if (body.sku) updateObj.sku = body.sku;
          if (body.price !== undefined) updateObj.price = Number(body.price);
          if (body.stock !== undefined) updateObj.stock = Number(body.stock);

          const { error: vError } = await supabaseAdmin
            .from('product_variants')
            .update(updateObj)
            .eq('id', variants[0].id);
          
          if (vError) console.error('Failed to update variant from product form:', vError);
        } else {
          // Create new variant
          const { error: vError } = await supabaseAdmin
            .from('product_variants')
            .insert([{
              product_id: id,
              variant_label: 'Standard',
              sku: body.sku || `NSD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
              price: Number(body.price) || 0,
              stock: Number(body.stock) || 0,
              reorder_threshold: 10,
              is_active: true,
            }]);
          
          if (vError) console.error('Failed to create default variant from product form:', vError);
        }
      } catch (err) {
        console.error('Variant sync error:', err);
      }
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('Failed to update product', error);
    return NextResponse.json({ 
      error: 'Failed to update product',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

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
    const { data: deleted, error } = await supabaseAdmin
      .from('products')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Failed to delete product', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    if (deleted) {
      try {
        const { notifyDeletedProduct } = await import('@/lib/notifications/service');
        await notifyDeletedProduct(deleted.name);
      } catch (notifErr) {
        console.error('Failed to trigger product deletion notification:', notifErr);
      }
    }

    return NextResponse.json({ message: 'Product archived successfully' });
  } catch (error) {
    console.error('Failed to delete product', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
