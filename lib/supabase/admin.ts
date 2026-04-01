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

  const truncInterval = range === 'day' ? 'hour' : 'day';

  const { data, error } = await sb.rpc('get_sales_overview_rpc', {
    p_start_date: start,
    p_end_date: end,
    p_trunc_interval: truncInterval
  })

  if (error) throw error

  // The RPC returns { period, orders, revenue }
  // We still want to fill in empty gaps for charting
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

  ; (data || []).forEach((row: any) => {
    // row.period is properly formatted from PG
    // If it matches our key format exactly, great, else we parse it.
    // The RPC formats 'YYYY-MM-DD' or 'YYYY-MM-DD HH24:00' which perfectly matches bucketKeyForDate
    if (map[row.period]) {
      map[row.period].revenue = Number(row.revenue);
      map[row.period].orders = Number(row.orders);
    }
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
    const { data, error } = await sb.rpc('get_sales_by_category_rpc', {
      p_start_date: start,
      p_end_date: end
    })

    if (error) throw error

    let grandTotal = 0;
    const result = (data || []).map((row: any) => {
      const revenue = Number(row.revenue);
      grandTotal += revenue;
      return {
        category: row.category || 'Uncategorized',
        revenue: Number(revenue.toFixed(2)),
        percent: Number(row.percent),
        orders: Number(row.sales) // Map sales (units) to orders for UI naming consistency
      };
    });

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

async function getCategories(supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return { categories: data || [] }
}

async function createCategory(data: any, supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  const { data: category, error } = await sb
    .from('categories')
    .insert(data)
    .select('*')
    .single()

  if (error) throw error
  return { category }
}

async function updateCategory(id: string, data: any, supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  
  // If name is changing, we need to update all products using the old name
  if (data.name) {
    const { data: oldCategory, error: getError } = await sb
      .from('categories')
      .select('name')
      .eq('id', id)
      .single()

    if (getError) throw getError

    if (oldCategory.name !== data.name) {
      const { error: updateProductsError } = await sb
        .from('products')
        .update({ category: data.name })
        .eq('category', oldCategory.name)

      if (updateProductsError) throw updateProductsError
    }
  }

  const { data: category, error } = await sb
    .from('categories')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return { category }
}

async function deleteCategory(id: string, supabase?: SupabaseClient) {
  const sb = getClient(supabase)
  
  // First, check if any product is still using this category name
  const { data: category, error: getError } = await sb
    .from('categories')
    .select('name')
    .eq('id', id)
    .single()

  if (getError) throw getError
  
  const { count, error: countError } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', category.name)

  if (countError) throw countError
  
  if (count && count > 0) {
    throw new Error(`Cannot delete category "${category.name}" because it is currently assigned to ${count} products.`)
  }

  const { error } = await sb
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
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
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
}

export type { Range, GrowthMetric, RecentOrder }
