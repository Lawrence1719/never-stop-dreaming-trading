import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedRange = (searchParams.get('range') as Range) || 'week'
  const range: Range = allowedRanges.includes(requestedRange) ? requestedRange : 'week'
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = getClient()
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Failed to load profile for dashboard', profileError)
      return NextResponse.json({ error: 'Unable to verify user role' }, { status: 500 })
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 })
  }
}

