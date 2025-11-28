import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all products
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, stock, reorder_threshold, category, is_active');

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // Calculate inventory statistics
    let totalProducts = 0;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    const lowStockItems: Array<{
      name: string;
      sku: string;
      stock: number;
      threshold: number;
      status: 'critical' | 'low';
    }> = [];

    const categoryStats: Record<string, {
      total: number;
      inStock: number;
      lowStock: number;
      outOfStock: number;
    }> = {};

    (products || []).forEach((product: any) => {
      if (!product.is_active) return; // Skip inactive products
      
      totalProducts++;
      const stock = product.stock || 0;
      const threshold = product.reorder_threshold || 5;
      const category = product.category || 'Uncategorized';

      // Initialize category stats if needed
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
      }
      categoryStats[category].total++;

      // Categorize stock status
      if (stock === 0) {
        outOfStock++;
        categoryStats[category].outOfStock++;
      } else if (stock <= threshold) {
        lowStock++;
        categoryStats[category].lowStock++;
        lowStockItems.push({
          name: product.name,
          sku: product.sku || '',
          stock,
          threshold,
          status: stock <= threshold * 0.5 ? 'critical' : 'low',
        });
      } else {
        inStock++;
        categoryStats[category].inStock++;
      }
    });

    // Sort low stock items by status (critical first)
    lowStockItems.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      return a.stock - b.stock;
    });

    // Format category stats
    const inventoryByCategory = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      total: stats.total,
      inStock: stats.inStock,
      lowStock: stats.lowStock,
      outOfStock: stats.outOfStock,
    }));

    return NextResponse.json({
      summary: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        inStockPercentage: totalProducts > 0 ? ((inStock / totalProducts) * 100).toFixed(1) : '0',
      },
      lowStockItems: lowStockItems.slice(0, 20), // Limit to top 20
      inventoryByCategory,
    });
  } catch (error) {
    console.error('Failed to load inventory report', error);
    return NextResponse.json({ error: 'Failed to load inventory report' }, { status: 500 });
  }
}


