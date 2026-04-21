import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Modern Inventory Report API.
 * Uses Cookie-based authentication via createServerClient.
 * Aligned with Database Schema (SKU on variants, multiple thresholds).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // 1. Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Use Admin Client (Service Role) to bypass RLS for report generation
    const admin = getSupabaseAdmin()

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // 4. Fetch products with their variants
    let productQuery = admin
      .from('products')
      .select(`
        id, 
        name, 
        reorder_threshold, 
        category, 
        is_active,
        created_at,
        updated_at,
        product_variants (
          id,
          variant_label,
          stock,
          sku,
          reorder_threshold,
          is_active,
          created_at,
          updated_at
        )
      `);
    
    // If date range is provided, we might want to filter for "Newly added" or "Recently updated"
    // For now, let's filter for anything UPDATED in this period to show activity
    if (startDate) productQuery = productQuery.gte('updated_at', startDate);
    if (endDate) productQuery = productQuery.lte('updated_at', endDate);

    const { data: products, error: productsError } = await productQuery;

    if (productsError) {
      console.error('[Inventory Report] Database Error:', productsError)
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: productsError.message,
        hint: productsError.hint 
      }, { status: 500 })
    }

    // 5. Calculate inventory statistics
    let totalProducts = 0
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    const lowStockItems: Array<{
      name: string
      variant?: string
      sku: string
      stock: number
      threshold: number
      status: 'critical' | 'low'
    }> = []

    const categoryStats: Record<string, {
      total: number
      inStock: number
      lowStock: number
      outOfStock: number
    }> = {}

    ;(products || []).forEach((product: any) => {
      if (!product.is_active) return // Skip inactive products
      
      totalProducts++
      const category = product.category || 'Uncategorized'

      // Initialize category stats if needed
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
      }
      categoryStats[category].total++

      // Process variants
      const variants = (product.product_variants || []).filter((v: any) => v.is_active)
      
      // Calculate total stock for summary
      const totalProductStock = variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0)
      
      // Default product threshold (fallback)
      const baseThreshold = product.reorder_threshold || 5

      // Check each variant for low stock alerts
      let anyVariantOut = false
      let anyVariantLow = false

      variants.forEach((v: any) => {
        const threshold = v.reorder_threshold || baseThreshold
        const stock = v.stock ?? 0

        if (stock === 0) {
          anyVariantOut = true
          lowStockItems.push({
            name: product.name,
            variant: v.variant_label,
            sku: v.sku || '',
            stock,
            threshold,
            status: 'critical',
          })
        } else if (stock <= threshold) {
          anyVariantLow = true
          lowStockItems.push({
            name: product.name,
            variant: v.variant_label,
            sku: v.sku || '',
            stock,
            threshold,
            status: stock <= threshold * 0.5 ? 'critical' : 'low',
          })
        }
      })

      // Update basic counts based on product aggregate
      if (totalProductStock === 0) {
        outOfStock++
        categoryStats[category].outOfStock++
      } else if (anyVariantLow || anyVariantOut) {
        // If ANY variant is low/out, we consider the product status as needing attention
        lowStock++
        categoryStats[category].lowStock++
      } else {
        inStock++
        categoryStats[category].inStock++
      }
    })

    // Sort low stock items by status (critical first)
    lowStockItems.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1
      if (a.status !== 'critical' && b.status === 'critical') return 1
      return a.stock - b.stock
    })

    // Format category stats
    const inventoryByCategory = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      total: stats.total,
      inStock: stats.inStock,
      lowStock: stats.lowStock,
      outOfStock: stats.outOfStock,
    }))

    return NextResponse.json({
      summary: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        inStockPercentage: totalProducts > 0 ? ((inStock / totalProducts) * 100).toFixed(1) : '0',
      },
      lowStockItems: lowStockItems.slice(0, 30), // Limit to top 30
      inventoryByCategory,
    })
  } catch (error) {
    console.error('Failed to load inventory report [Crash]', error)
    return NextResponse.json({ 
      error: 'Unexpected server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
