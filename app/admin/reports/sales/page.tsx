'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/formatting';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, FileSpreadsheet } from 'lucide-react';

import { SalesExportModal } from '@/components/admin/reports/SalesExportModal';

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
  topProducts: Array<{ name: string; sold: number; revenue: number }>;
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'all'>('month');

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      
      try {
        // We use the new modernized API route which handles auth via Cookies
        const res = await fetch(`/api/admin/reports/sales?range=${range}`);

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
  }, [range]);

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive sales analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
           <select 
            value={range} 
            onChange={(e) => setRange(e.target.value as any)}
            className="bg-background border rounded px-2 py-1 text-sm h-10"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">Lifetime</option>
          </select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" disabled={isLoading || !data}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-red-500" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-blue-500" />
                <span>Export as CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-500" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Revenue', value: data?.summary.totalRevenue, growth: data?.summary.revenueGrowth, isPrice: true },
          { title: 'Total Orders', value: data?.summary.totalOrders, growth: data?.summary.ordersGrowth },
          { title: 'Avg. Order Value', value: data?.summary.averageOrderValue, growth: data?.summary.aovGrowth, isPrice: true },
          { title: 'Conversion Rate', value: data?.summary.conversionRate, isPercent: true, subtitle: 'Estimated' }
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stat.isPrice ? formatPrice(stat.value ?? 0) : 
                     stat.isPercent ? `${(stat.value ?? 0).toFixed(2)}%` : 
                     (stat.value ?? 0).toLocaleString()}
                  </div>
                  {stat.growth !== undefined ? (
                    <p className={`text-xs mt-1 ${stat.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.growth >= 0 ? '+' : ''}{stat.growth.toFixed(2)}% from last period
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
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
              <Skeleton className="h-full w-full" />
            </div>
          ) : data && data.salesByCategory.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="category" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₱${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: 'var(--muted)', opacity: 0.1}}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : data && data.topProducts.length > 0 ? (
                  data.topProducts.map((product, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm">{product.name}</TableCell>
                      <TableCell className="text-right">{product.sold}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {product.revenue}
                      </TableCell>
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
          </div>
        </CardContent>
      </Card>

      {data && (
        <SalesExportModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          format={exportFormat}
          data={data}
        />
      )}
    </div>
  );
}
