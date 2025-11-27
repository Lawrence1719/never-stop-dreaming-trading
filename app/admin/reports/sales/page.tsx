'use client';

import { useState, useEffect } from 'react';
import { Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { exportToCSV } from '@/lib/utils/export';

interface SalesReport {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
    revenueGrowth: number;
    ordersGrowth: number;
    aovGrowth: number;
  };
  salesByCategory: Array<{ category: string; sales: number; revenue: number }>;
  topProducts: Array<{ name: string; sold: number; revenue: string }>;
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/admin/reports/sales?range=month', {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (!res.ok) {
          throw new Error('Failed to load sales report');
        }

        const reportData = await res.json();
        setData(reportData);
      } catch (err) {
        console.error('Failed to load sales report', err);
        setError(err instanceof Error ? err.message : 'Failed to load sales report');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, []);

  const handleExport = () => {
    if (!data) return;
    
    // Export summary
    const summaryData = [{
      Metric: 'Total Revenue',
      Value: `₱${data.summary.totalRevenue.toFixed(2)}`,
      'Growth %': `${data.summary.revenueGrowth.toFixed(2)}%`,
    }, {
      Metric: 'Total Orders',
      Value: data.summary.totalOrders,
      'Growth %': `${data.summary.ordersGrowth.toFixed(2)}%`,
    }, {
      Metric: 'Average Order Value',
      Value: `₱${data.summary.averageOrderValue.toFixed(2)}`,
      'Growth %': `${data.summary.aovGrowth.toFixed(2)}%`,
    }, {
      Metric: 'Conversion Rate',
      Value: `${data.summary.conversionRate}%`,
      'Growth %': 'N/A',
    }];

    exportToCSV(summaryData, 'sales_summary');
    
    // Export top products
    setTimeout(() => {
      const productsData = data.topProducts.map(p => ({
        'Product Name': p.name,
        'Units Sold': p.sold,
        'Revenue': p.revenue,
      }));
      exportToCSV(productsData, 'top_products');
    }, 500);
  };

  const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive sales analytics and insights</p>
        </div>
        <Button className="gap-2" onClick={handleExport} disabled={isLoading || !data}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? currencyFormatter.format(data.summary.totalRevenue) : '₱0.00'}
                </div>
                <p className={`text-xs mt-1 ${data && data.summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data ? `${data.summary.revenueGrowth >= 0 ? '+' : ''}${data.summary.revenueGrowth.toFixed(2)}% from last month` : 'N/A'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? data.summary.totalOrders.toLocaleString() : '0'}
                </div>
                <p className={`text-xs mt-1 ${data && data.summary.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data ? `${data.summary.ordersGrowth >= 0 ? '+' : ''}${data.summary.ordersGrowth.toFixed(2)}% from last month` : 'N/A'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? currencyFormatter.format(data.summary.averageOrderValue) : '₱0.00'}
                </div>
                <p className={`text-xs mt-1 ${data && data.summary.aovGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data ? `${data.summary.aovGrowth >= 0 ? '+' : ''}${data.summary.aovGrowth.toFixed(2)}% from last month` : 'N/A'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? `${data.summary.conversionRate.toFixed(2)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Estimated</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales by Category Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>Revenue distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading chart data...</div>
            </div>
          ) : data && data.salesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.salesByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                <XAxis dataKey="category" stroke="rgb(var(--color-muted-foreground))" />
                <YAxis stroke="rgb(var(--color-muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--color-card))', border: '1px solid rgb(var(--color-border))' }} />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No sales data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
          <CardDescription>Best selling products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`loading-${idx}`} className="animate-pulse">
                    <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                  </TableRow>
                ))
              ) : data && data.topProducts.length > 0 ? (
                data.topProducts.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sold}</TableCell>
                    <TableCell className="text-green-600 font-medium">{product.revenue}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No product data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
