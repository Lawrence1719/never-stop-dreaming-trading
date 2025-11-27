import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { MAIN_CATEGORIES, CATEGORY_TREE } from '@/lib/data/categories';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to load profile for categories', profileError);
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get distinct categories from products
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('category, is_active');

    if (productsError) {
      console.error('Failed to fetch products for categories', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // Count products per category and determine parent categories
    const categoryMap = new Map<string, { count: number; activeCount: number; parent: string }>();
    
    (products || []).forEach((product: any) => {
      const category = product.category || '';
      if (!category) return;
      
      // Determine parent category
      let parent = 'None';
      for (const [mainCat, subCats] of Object.entries(CATEGORY_TREE)) {
        if (category === mainCat || subCats.includes(category)) {
          parent = category === mainCat ? 'None' : mainCat;
          break;
        }
      }
      
      const existing = categoryMap.get(category) || { count: 0, activeCount: 0, parent };
      existing.count += 1;
      if (product.is_active) {
        existing.activeCount += 1;
      }
      categoryMap.set(category, existing);
    });

    // Build categories array
    const categories = Array.from(categoryMap.entries()).map(([name, data], index) => ({
      id: index + 1,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      parent: data.parent,
      products: data.count,
      status: data.activeCount > 0 ? 'active' : 'inactive',
    }));

    // Sort by name
    categories.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Failed to load categories', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

