import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
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
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabaseAdmin = getClient();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: name' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
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

    if (error) {
      console.error('Failed to update product', error);
      return NextResponse.json({ 
        error: 'Failed to update product',
        details: error.message 
      }, { status: 500 });
    }

    // Sync product images
    if (body.product_images && Array.isArray(body.product_images)) {
      // Simplest way: Delete all existing and re-insert 
      // (Or a more complex diff if performance matters, but for few images this is safe)
      await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (body.product_images.length > 0) {
        const imagesToInsert = body.product_images.map((img: any, index: number) => ({
          product_id: id,
          storage_path: img.storage_path,
          sort_order: img.sort_order ?? index,
          is_primary: img.is_primary || false,
        }));

        const { error: imagesError } = await supabaseAdmin
          .from('product_images')
          .insert(imagesToInsert);

        if (imagesError) {
          console.error('Failed to sync product images', imagesError);
        }
      }
    }

    return NextResponse.json({ data });
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
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const authResult = await verifyAdminAuth(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const supabaseAdmin = getClient();
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete product', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
