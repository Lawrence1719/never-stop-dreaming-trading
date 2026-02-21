'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowDown, ArrowUp, DollarSign, ShoppingCart, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils/formatting';

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
    status: string;
    total: number;
    created_at: string;
    user_id: string | null;
    customer_name: string | null;
  }>;
};

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DashboardRange>('week');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousDateRangeRef = useRef<DashboardRange>('week');

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(`/api/admin/dashboard?range=${dateRange}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const errorMessage = 
            payload.error || 
            payload.message || 
            `HTTP ${res.status}: ${res.statusText}` ||
            'Failed to load dashboard data';
          
          console.error('Dashboard API error:', {
            status: res.status,
            statusText: res.statusText,
            message: errorMessage,
            payload,
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
        icon: DollarSign,
      },
      {
        title: 'Total Orders',
        value: data.stats.totals.orders?.toLocaleString() ?? '0',
        change: `${data.stats.changes.orders.change.toFixed(2)}%`,
        direction: data.stats.changes.orders.direction,
        icon: ShoppingCart,
      },
      {
        title: 'Total Customers',
        value: data.stats.totals.customers?.toLocaleString() ?? '0',
        change: `${data.stats.changes.customers.change.toFixed(2)}%`,
        direction: data.stats.changes.customers.direction,
        icon: Users,
      },
      {
        title: 'Avg Order Value',
        value: formatPrice(data.stats.totals.averageOrderValue ?? 0),
        change: `${data.stats.changes.averageOrderValue.change.toFixed(2)}%`,
        direction: data.stats.changes.averageOrderValue.direction,
        icon: TrendingUp,
      },
    ];
  }, [data]);

  const salesData = data?.salesOverview.series ?? [];
  const categoryData =
    data?.salesByCategory.breakdown.map((item) => ({
      name: item.category,
      value: item.percent,
      revenue: item.revenue,
    })) ?? [];
  const recentOrders = data?.recentOrders ?? [];

  return (
    <div className="space-y-8">
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
                <Card key={idx}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p
                      className={`text-xs flex items-center gap-1 mt-1 ${
                        isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Your sales performance over the {dateRange}</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">{isLoading ? 'Loading chart...' : 'No sales data for the selected range.'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                  <XAxis dataKey="period" stroke="rgb(var(--color-muted-foreground))" />
                  <YAxis stroke="rgb(var(--color-muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--color-card))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Distribution breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">{isLoading ? 'Loading breakdown...' : 'No category data available.'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
            <Button variant="outline" size="sm">View All</Button>
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
                    <TableCell className="font-medium">{order.id}</TableCell>
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
                      {new Date(order.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
