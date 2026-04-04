'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ShoppingCart, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatPrice, formatDateTime } from '@/lib/utils/formatting';
import { DashboardDetailModal, type DashboardMetric } from '@/components/admin/dashboard/DashboardDetailModal';

type DashboardRange = 'day' | 'week' | 'month';

type GrowthDirection = 'up' | 'down' | 'neutral';

type GrowthMetric = {
  change: number;
  direction: GrowthDirection;
  current: number;
  previous: number;
};

type DashboardResponse = {
  range: DashboardRange | 'all';
  stats: {
    totals: {
      revenue: number;
      orders: number;
      customers: number;
      averageOrderValue: number;
    };
    changes: {
      revenue: GrowthMetric;
      orders: GrowthMetric;
      customers: GrowthMetric;
      averageOrderValue: GrowthMetric;
    };
  };
  salesOverview: {
    series: Array<{ period: string; revenue: number; orders: number }>;
    totalRevenue: number;
    totalOrders: number;
  };
  salesByCategory: {
    breakdown: Array<{ category: string; revenue: number; percent: number }>;
    totalRevenue: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber?: string;
    status: string;
    total: number;
    created_at: string;
    user_id: string | null;
    customer_name: string | null;
  }>;
};

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const PesoIcon = ({ className }: { className?: string }) => (
  <span className={className + " font-bold flex items-center justify-center text-xl"}>₱</span>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DashboardRange>('week');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'orders' | 'revenue'>('revenue');
  const previousDateRangeRef = useRef<DashboardRange>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMetric, setModalMetric] = useState<DashboardMetric | null>(null);
  const [legendPosition, setLegendPosition] = useState<'right' | 'bottom'>('right');

  useEffect(() => {
    const handleResize = () => {
      setLegendPosition(window.innerWidth < 2500 ? 'bottom' : 'right');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openModal = (metric: DashboardMetric) => {
    setModalMetric(metric);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      try {
        const res = await fetch(`/api/admin/dashboard?range=${dateRange}`, {
          method: 'GET',
          signal: controller.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const errorMessage =
            payload.error ||
            payload.message ||
            `HTTP ${res.status}: ${res.statusText}` ||
            'Failed to load dashboard data';

          console.error('Dashboard API error detail:', {
            status: res.status,
            statusText: res.statusText,
            errorMessage: errorMessage,
            payload: JSON.stringify(payload) // Ensure payload is logged as string if object logging fails
          });

          throw new Error(errorMessage);
        }
        const payload: DashboardResponse = await res.json();
        setData(payload);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        console.error('Failed to load dashboard data:', {
          error: err,
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
        });
        setError(errorMessage);
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          previousDateRangeRef.current = dateRange;
        }
      }
    }

    // Only show loader if date range actually changed from the previous one
    if (previousDateRangeRef.current !== dateRange) {
      setIsLoading(true);
    }

    loadDashboard();

    return () => controller.abort();
  }, [dateRange]);

  const stats = useMemo(() => {
    if (!data) return null;
    return [
      {
        title: 'Total Revenue',
        value: formatPrice(data.stats.totals.revenue ?? 0),
        change: `${data.stats.changes.revenue.change.toFixed(2)}%`,
        direction: data.stats.changes.revenue.direction,
        icon: PesoIcon,
        metric: 'revenue' as DashboardMetric,
      },
      {
        title: 'Total Orders',
        value: data.stats.totals.orders?.toLocaleString() ?? '0',
        change: `${data.stats.changes.orders.change.toFixed(2)}%`,
        direction: data.stats.changes.orders.direction,
        icon: ShoppingCart,
        metric: 'orders' as DashboardMetric,
      },
      {
        title: 'Total Customers',
        value: data.stats.totals.customers?.toLocaleString() ?? '0',
        change: `${data.stats.changes.customers.change.toFixed(2)}%`,
        direction: data.stats.changes.customers.direction,
        icon: Users,
        metric: 'customers' as DashboardMetric,
      },
      {
        title: 'Avg Order Value',
        value: formatPrice(data.stats.totals.averageOrderValue ?? 0),
        change: `${data.stats.changes.averageOrderValue.change.toFixed(2)}%`,
        direction: data.stats.changes.averageOrderValue.direction,
        icon: TrendingUp,
        metric: 'aov' as DashboardMetric,
      },
    ];
  }, [data]);

  const salesData = data?.salesOverview.series ?? [];
  const categoryData =
    data?.salesByCategory.breakdown.map((item) => ({
      name: item.category === 'Uncategorized' ? 'Other' : item.category,
      value: item.percent,
      revenue: item.revenue,
    })) ?? [];
  const recentOrders = data?.recentOrders ?? [];

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <span className="font-semibold">Error Loading Dashboard:</span>
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange(prev => prev)} // Trigger reload
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {user ? `Welcome back, ${user.name}! Here's your sales overview.` : "Welcome back! Here's your sales overview."}
          </p>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Logged in as: {user.email} | Role: {user.role}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {['day', 'week', 'month'].map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              onClick={() => setDateRange(range as DashboardRange)}
              disabled={isLoading}
              className="relative"
            >
              {isLoading && dateRange === range ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                range.charAt(0).toUpperCase() + range.slice(1)
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats
          ? stats.map((stat, idx) => {
            const Icon = stat.icon;
            const isPositive = stat.direction === 'up';
            const isNeutral = stat.direction === 'neutral';
            return (
              <Card
                key={idx}
                className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
                onClick={() => openModal(stat.metric)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p
                    className={`text-xs flex items-center gap-1 mt-1 ${isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                  >
                    {isNeutral ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : isPositive ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {stat.change} from last period
                  </p>
                </CardContent>
              </Card>
            );
          })
          : Array.from({ length: 4 }).map((_, idx) => (
            <Card key={`placeholder-${idx}`} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-32 bg-muted rounded mb-2" />
                <div className="h-4 w-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 flex flex-col h-[480px]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Your sales performance over the {dateRange}</CardDescription>
            </div>
            <div className="flex bg-muted p-1 rounded-lg self-start sm:self-center">
              <button
                onClick={() => setActiveMetric('orders')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${activeMetric === 'orders'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveMetric('revenue')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${activeMetric === 'revenue'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Revenue
              </button>
            </div>
          </CardHeader>
          <CardContent
            className="cursor-pointer hover:opacity-90 transition-opacity flex-1 w-full min-h-0"
            onClick={() => openModal('sales_overview')}
          >
            {salesData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">{isLoading ? 'Loading chart...' : 'No sales data for the selected range.'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    strokeOpacity={0.85}
                    vertical
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    tickLine={{ stroke: 'var(--border)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    tickLine={{ stroke: 'var(--border)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickFormatter={(value) => activeMetric === 'revenue' ? formatPrice(value).replace('₱', '') : value}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: any) => [activeMetric === 'revenue' ? formatPrice(value) : value, activeMetric === 'revenue' ? 'Revenue' : 'Orders']}
                  />
                  <Line
                    type="monotone"
                    dataKey={activeMetric}
                    stroke={activeMetric === 'orders' ? '#3b82f6' : '#10b981'}
                    strokeWidth={2}
                    strokeOpacity={1}
                    fill="none"
                    connectNulls={true}
                    dot={{ r: 4, fill: activeMetric === 'orders' ? '#3b82f6' : '#10b981', strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[480px]">
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Distribution breakdown</CardDescription>
          </CardHeader>
          <CardContent
            className="cursor-pointer hover:opacity-90 transition-opacity flex-1 w-full min-h-0"
            onClick={() => openModal('sales_by_category')}
          >
            {categoryData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">{isLoading ? 'Loading breakdown...' : 'No category data available.'}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ left: 25, right: 10 }}>
                  <Pie
                    data={categoryData}
                    cx={legendPosition === 'right' ? "42%" : "50%"}
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value}% (${formatPrice(props.payload.revenue)})`,
                      'Share'
                    ]}
                  />
                  <Legend
                    layout={legendPosition === 'right' ? "vertical" : "horizontal"}
                    verticalAlign={legendPosition === 'right' ? "middle" : "bottom"}
                    align={legendPosition === 'right' ? "right" : "center"}
                    iconType="circle"
                    formatter={(value, entry: any) => (
                      <span className="text-[11px] text-muted-foreground font-semibold inline-block">
                        {value}: <span className="text-foreground ml-1">{entry.payload.value}%</span> <span className="text-[10px] ml-1 opacity-70">({formatPrice(entry.payload.revenue)})</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest 4 orders from your store</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/orders">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && recentOrders.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`loading-${idx}`} className="animate-pulse">
                    <TableCell colSpan={5}>
                      <div className="h-4 bg-muted rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No recent orders found.
                  </TableCell>
                </TableRow>
              ) : (
                recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber || order.id}</TableCell>
                    <TableCell>{order.customer_name ?? 'Guest'}</TableCell>
                    <TableCell>{formatPrice(order.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'completed' || order.status === 'shipped'
                            ? 'default'
                            : order.status === 'processing'
                              ? 'secondary'
                              : order.status === 'pending'
                                ? 'outline'
                                : order.status === 'paid'
                                  ? 'secondary'
                                  : order.status === 'cancelled'
                                    ? 'destructive'
                                    : 'outline'
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DashboardDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        metric={modalMetric}
        data={data}
        dateRange={dateRange}
      />
    </div>
  );
}
