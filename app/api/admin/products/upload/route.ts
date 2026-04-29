import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

/**
 * Priority 4: Server-side Image Upload Validation
 * Handles image uploads with strict server-side checks for count, size, and type.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getClient();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // 1. Validate count (max 10)
    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 images allowed' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const uploadedPaths: string[] = [];

    for (const file of files) {
      // 2. Validate type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.` }, { status: 400 });
      }

      // 3. Validate size
      if (file.size > maxSize) {
        return NextResponse.json({ error: `File too large: ${file.name}. Max size is 5MB.` }, { status: 400 });
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json({ error: `Failed to upload ${file.name}` }, { status: 500 });
      }

      uploadedPaths.push(data.path);
    }

    return NextResponse.json({ 
      success: true, 
      paths: uploadedPaths 
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
