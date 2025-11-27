import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'

function getClient(client?: SupabaseClient) {
  if (client) return client
  
  // Try multiple possible environment variable names
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    ''
  
  const supabaseServiceKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    ''
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase URL or Service Role Key is not defined in environment. ' +
      `URL: ${supabaseUrl ? '✓' : '✗'}, Key: ${supabaseServiceKey ? '✓' : '✗'}. ` +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    )
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

type Range = 'day' | 'week' | 'month' | 'all'

function getDateRange(range: Range) {
  const end = new Date()
  let start = new Date()
  switch (range) {
    case 'day':
      start.setHours(end.getHours() - 23, 0, 0, 0)
      break
    case 'week':
      start.setDate(end.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break
    case 'month':
      start.setDate(end.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start = new Date(0)
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

async function getTotalRevenue(range: Range = 'all', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { start, end } = getDateRange(range)

  const q = sb
    .from('orders')
    .select('total')
    .neq('status', 'cancelled')
    .gte('created_at', start)
    .lte('created_at', end)

  const { data, error } = await q
  if (error) throw error

  const revenue = (data || []).reduce((acc: number, row: any) => acc + (row.total || 0), 0)
  return { revenue }
}

async function getTotalOrders(range: Range = 'all', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { start, end } = getDateRange(range)

  const { count, error } = await sb
    .from('orders')
    .select('id', { count: 'exact', head: false })
    .neq('status', 'cancelled')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) throw error
  return { orders: count ?? 0 }
}

async function getTotalCustomers(range: Range = 'all', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { start, end } = getDateRange(range)

  // Count profiles created in range (total customers)
  const { count, error } = await sb
    .from('profiles')
    .select('id', { count: 'exact' })
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) throw error
  return { customers: count ?? 0 }
}

async function getAverageOrderValue(range: Range = 'all', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const [{ revenue }, { orders }] = await Promise.all([
    getTotalRevenue(range, sb),
    getTotalOrders(range, sb),
  ])
  const aov = orders > 0 ? revenue / orders : 0
  return { averageOrderValue: Number(aov.toFixed(2)) }
}

function bucketKeyForDate(date: Date, range: Range) {
  if (range === 'day') {
    // return hour label
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
  }
  // default day grouping
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

async function getSalesOverview(range: Range = 'week', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { start, end } = getDateRange(range)

  const { data, error } = await sb
    .from('orders')
    .select('id, total, created_at')
    .neq('status', 'cancelled')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) throw error

  const map: Record<string, { revenue: number; orders: number }> = {}

  // initialize buckets
  const s = new Date(start)
  const e = new Date(end)
  const cur = new Date(s)
  while (cur <= e) {
    const key = bucketKeyForDate(cur, range)
    map[key] = { revenue: 0, orders: 0 }
    if (range === 'day') cur.setHours(cur.getHours() + 1)
    else cur.setDate(cur.getDate() + 1)
  }

  ;(data || []).forEach((o: any) => {
    const created = new Date(o.created_at)
    const key = bucketKeyForDate(created, range)
    if (!map[key]) map[key] = { revenue: 0, orders: 0 }
    map[key].revenue += o.total || 0
    map[key].orders += 1
  })

  const series = Object.keys(map).map((k) => ({
    period: k,
    revenue: Number(map[k].revenue.toFixed(2)),
    orders: map[k].orders,
  }))

  const totalRevenue = series.reduce((a, b) => a + b.revenue, 0)
  const totalOrders = series.reduce((a, b) => a + b.orders, 0)

  return { series, totalRevenue: Number(totalRevenue.toFixed(2)), totalOrders }
}

function isMissingRelationError(error: unknown, relation: string) {
  if (!error || typeof error !== 'object') return false
  const err = error as PostgrestError
  return err?.code === '42P01' || err?.message?.toLowerCase().includes(`relation "${relation}" does not exist`)
}

async function getSalesByCategory(range: Range = 'all', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { start, end } = getDateRange(range)

  try {
    // Query order_items with joins to orders (for date filtering) and products (for category)
    const { data, error } = await sb
      .from('order_items')
      .select('quantity, price, orders!inner(created_at, status), products(category)')
      .gte('orders.created_at', start)
      .lte('orders.created_at', end)
      .neq('orders.status', 'cancelled')

    if (error) {
      // If the join syntax fails, try a simpler approach
      if (error.message?.includes('join') || error.message?.includes('relation')) {
        // Fallback: query orders first, then get order_items
        const { data: ordersData, error: ordersError } = await sb
          .from('orders')
          .select('id, created_at, status')
          .gte('created_at', start)
          .lte('created_at', end)
          .neq('status', 'cancelled')

        if (ordersError) throw ordersError

        const orderIds = (ordersData || []).map((o: any) => o.id)
        if (orderIds.length === 0) {
          return { breakdown: [], totalRevenue: 0 }
        }

        const { data: itemsData, error: itemsError } = await sb
          .from('order_items')
          .select('quantity, price, product_id, products(category)')
          .in('order_id', orderIds)

        if (itemsError) throw itemsError

        const totals: Record<string, number> = {}
        let grandTotal = 0
        ;(itemsData || []).forEach((row: any) => {
          const category = (row.products && row.products.category) || 'Uncategorized'
          const amount = Number(row.price || 0) * Number(row.quantity || 0)
          totals[category] = (totals[category] || 0) + amount
          grandTotal += amount
        })

        const result = Object.keys(totals).map((cat) => ({
          category: cat,
          revenue: Number(totals[cat].toFixed(2)),
          percent: grandTotal > 0 ? Number(((totals[cat] / grandTotal) * 100).toFixed(2)) : 0,
        }))

        return { breakdown: result, totalRevenue: Number(grandTotal.toFixed(2)) }
      }
      throw error
    }

    const totals: Record<string, number> = {}
    let grandTotal = 0
    ;(data || []).forEach((row: any) => {
      const category = (row.products && row.products.category) || 'Uncategorized'
      const amount = Number(row.price || 0) * Number(row.quantity || 0)
      totals[category] = (totals[category] || 0) + amount
      grandTotal += amount
    })

    const result = Object.keys(totals).map((cat) => ({
      category: cat,
      revenue: Number(totals[cat].toFixed(2)),
      percent: grandTotal > 0 ? Number(((totals[cat] / grandTotal) * 100).toFixed(2)) : 0,
    }))

    return { breakdown: result, totalRevenue: Number(grandTotal.toFixed(2)) }
  } catch (error) {
    console.error('[admin] Error fetching sales by category:', error)
    // Return empty breakdown instead of throwing to allow dashboard to still load
    return { breakdown: [], totalRevenue: 0 }
  }
}

type GrowthMetric = 'revenue' | 'orders' | 'customers' | 'aov'

async function getGrowthRate(metric: GrowthMetric, range: Range = 'week', supabase?: SupabaseClient) {
  const sb = getClient(supabase)

  // compute current period
  const curRange = getDateRange(range)
  const currentStart = new Date(curRange.start)
  const currentEnd = new Date(curRange.end)

  // previous period: same length immediately before currentStart
  const prevEnd = new Date(currentStart)
  const diffMs = currentEnd.getTime() - currentStart.getTime()
  const prevStart = new Date(currentStart.getTime() - diffMs)

  const periodToValue = async (start: Date, end: Date) => {
    const s = start.toISOString()
    const e = end.toISOString()
    switch (metric) {
      case 'revenue': {
        const { data, error } = await sb
          .from('orders')
          .select('total')
          .neq('status', 'cancelled')
          .gte('created_at', s)
          .lte('created_at', e)
        if (error) throw error
        return (data || []).reduce((acc: number, r: any) => acc + (Number(r.total) || 0), 0)
      }
      case 'orders': {
        const { count, error } = await sb
          .from('orders')
          .select('id', { count: 'exact' })
          .neq('status', 'cancelled')
          .gte('created_at', s)
          .lte('created_at', e)
        if (error) throw error
        return count ?? 0
      }
      case 'customers': {
        const { count, error } = await sb
          .from('profiles')
          .select('id', { count: 'exact' })
          .gte('created_at', s)
          .lte('created_at', e)
        if (error) throw error
        return count ?? 0
      }
      case 'aov': {
        const { data, count, error } = await sb
          .from('orders')
          .select('total', { count: 'exact' })
          .neq('status', 'cancelled')
          .gte('created_at', s)
          .lte('created_at', e)
        if (error) throw error
        const revenue = (data || []).reduce((acc: number, r: any) => acc + (Number(r.total) || 0), 0)
        const totalOrders = count ?? (data?.length ?? 0)
        return totalOrders > 0 ? revenue / totalOrders : 0
      }
      default:
        return 0
    }
  }

  const [currentValue, previousValue] = await Promise.all([
    periodToValue(currentStart, currentEnd),
    periodToValue(prevStart, prevEnd),
  ])

  const delta = currentValue - previousValue
  let percent = 0
  if (previousValue === 0) {
    percent = currentValue === 0 ? 0 : 100
  } else {
    percent = (delta / Math.abs(previousValue)) * 100
  }

  const ensureNumber = (value: number) => (Number.isFinite(value) ? Number(value) : 0)

  return {
    metric,
    range,
    current: ensureNumber(currentValue),
    previous: ensureNumber(previousValue),
    change: Number(percent.toFixed(2)),
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
  }
}

type RecentOrder = {
  id: string
  total: number
  status: string
  created_at: string
  user_id: string | null
  customer_name: string | null
}

async function getRecentOrders(limit = 5, supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { data, error } = await sb
    .from('orders')
    .select('id, total, status, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const orders = data || []
  const userIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean))) as string[]

  let profilesMap: Record<string, { name: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await sb
      .from('profiles')
      .select('id, name')
      .in('id', userIds)
    if (profilesError) throw profilesError
    profilesMap = (profiles || []).reduce((acc, profile: any) => {
      acc[profile.id] = { name: profile.name }
      return acc
    }, {} as Record<string, { name: string | null }>)
  }

  const recentOrders: RecentOrder[] = orders.map((order: any) => ({
    id: order.id,
    total: Number(order.total || 0),
    status: order.status,
    created_at: order.created_at,
    user_id: order.user_id || null,
    customer_name: order.user_id ? profilesMap[order.user_id]?.name ?? null : null,
  }))

  return { orders: recentOrders }
}

export {
  getClient,
  getDateRange,
  getTotalRevenue,
  getTotalOrders,
  getTotalCustomers,
  getAverageOrderValue,
  getSalesOverview,
  getSalesByCategory,
  getGrowthRate,
  getRecentOrders,
}

export type { Range, GrowthMetric, RecentOrder }
