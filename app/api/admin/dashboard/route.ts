import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  getClient,
  getAverageOrderValue,
  getGrowthRate,
  getRecentOrders,
  getSalesByCategory,
  getSalesOverview,
  getTotalCustomers,
  getTotalOrders,
  getTotalRevenue,
  type Range,
} from '@/lib/supabase/admin'

const allowedRanges: Range[] = ['day', 'week', 'month', 'all']

/**
 * Modern Admin Dashboard API.
 * Uses Cookie-based authentication via createServerClient.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const requestedRange = searchParams.get('range') as any

    let range: Range = 'week'
    if (startDate && endDate) {
      range = { start: startDate, end: endDate }
    } else if (allowedRanges.includes(requestedRange)) {
      range = requestedRange
    }

    const supabaseAdmin = getClient()

    const [
      { revenue },
      { orders },
      { customers },
      { averageOrderValue },
      salesOverview,
      salesByCategory,
      revenueGrowth,
      ordersGrowth,
      customersGrowth,
      aovGrowth,
      { orders: recentOrders },
    ] = await Promise.all([
      getTotalRevenue(range, supabaseAdmin),
      getTotalOrders(range, supabaseAdmin),
      getTotalCustomers(range, supabaseAdmin),
      getAverageOrderValue(range, supabaseAdmin),
      getSalesOverview(range, supabaseAdmin),
      getSalesByCategory(range, supabaseAdmin),
      getGrowthRate('revenue', range, supabaseAdmin),
      getGrowthRate('orders', range, supabaseAdmin),
      getGrowthRate('customers', range, supabaseAdmin),
      getGrowthRate('aov', range, supabaseAdmin),
      getRecentOrders(4, supabaseAdmin),
    ])

    return NextResponse.json({
      range,
      stats: {
        totals: {
          revenue,
          orders,
          customers,
          averageOrderValue,
        },
        changes: {
          revenue: revenueGrowth,
          orders: ordersGrowth,
          customers: customersGrowth,
          averageOrderValue: aovGrowth,
        },
      },
      salesOverview,
      salesByCategory,
      recentOrders,
    })
  } catch (error) {
    console.error('Failed to load admin dashboard metrics', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
