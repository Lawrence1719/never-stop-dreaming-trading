import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''

function getClient(client?: SupabaseClient) {
  if (client) return client
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL or Service Role Key is not defined in environment')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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

async function getSalesByCategory(range: Range = 'all', supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { start, end } = getDateRange(range)

  // Attempt to select order_items with related product category (requires FK relationship)
  const { data, error } = await sb
    .from('order_items')
    .select('quantity, price, products(category)')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) throw error

  const totals: Record<string, number> = {}
  let grandTotal = 0
  ;(data || []).forEach((row: any) => {
    const category = (row.products && row.products.category) || 'Uncategorized'
    const amount = (row.price || 0) * (row.quantity || 0)
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

async function getGrowthRate(metric: 'revenue' | 'orders' | 'customers' | 'aov', range: Range = 'week', supabase?: SupabaseClient) {
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
    if (metric === 'revenue') {
      const { data, error } = await sb
        .from('orders')
        .select('total')
        .neq('status', 'cancelled')
        .gte('created_at', s)
        .lte('created_at', e)
      if (error) throw error
      return (data || []).reduce((acc: number, r: any) => acc + (r.total || 0), 0)
    }

    if (metric === 'orders') {
      const { count, error } = await sb
        .from('orders')
        .select('id', { count: 'exact' })
        .neq('status', 'cancelled')
        .gte('created_at', s)
        .lte('created_at', e)
      if (error) throw error
      return count ?? 0
    }

    if (metric === 'customers') {
      const { count, error } = await sb
        .from('profiles')
        .select('id', { count: 'exact' })
        .gte('created_at', s)
        .lte('created_at', e)
      if (error) throw error
      return count ?? 0
    }

    if (metric === 'aov') {
      const revenue = await periodToValue(start, end).catch((e) => { throw e })
      const { count } = await sb
        .from('orders')
        .select('id', { count: 'exact' })
        .neq('status', 'cancelled')
        .gte('created_at', s)
        .lte('created_at', e)
      const orders = count ?? 0
      return orders > 0 ? revenue / orders : 0
    }

    return 0
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

  return {
    metric,
    range,
    current: Number(currentValue instanceof Number ? currentValue : Number(currentValue.toFixed?.(2) ?? currentValue)),
    previous: Number(previousValue instanceof Number ? previousValue : Number(previousValue.toFixed?.(2) ?? previousValue)),
    change: Number(percent.toFixed(2)),
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
  }
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
}

export type { Range }
