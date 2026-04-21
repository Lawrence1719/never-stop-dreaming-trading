'use client';

import { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPeso, formatPrice } from '@/lib/utils/formatting';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, FileSpreadsheet } from 'lucide-react';

import { SalesExportModal } from '@/components/admin/reports/SalesExportModal';
import { getRelativeDateRangeLabel } from '@/components/admin/reports/PrintReportHeader';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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
  topProducts: Array<{ name: string; sold: number; revenue: number; isDeletedProduct?: boolean }>;
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'all'>('month');

  // Pagination states
  const [topProductsPage, setTopProductsPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      setTopProductsPage(1); // Reset page on range change
      
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

  // Pagination logic for Top Products
  const paginatedTopProducts = data?.topProducts.slice(
    (topProductsPage - 1) * itemsPerPage,
    topProductsPage * itemsPerPage
  ) || [];
  const totalTopProductsPages = Math.ceil((data?.topProducts.length || 0) / itemsPerPage);

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
      <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Sales by Category</CardTitle>
          <CardDescription className="text-muted-foreground">Revenue distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : data && data.salesByCategory.length > 0 ? (
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salesByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis 
                    dataKey="category" 
                    stroke="currentColor" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.7 }}
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="currentColor" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.7 }}
                    tickFormatter={(value) => `₱${value.toLocaleString()}`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="currentColor" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.7 }}
                    tickFormatter={(value) => `${value} units`}
                  />
                  <Tooltip 
                    cursor={{fill: 'currentColor', opacity: 0.05}}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-xs font-medium text-muted-foreground">{value}</span>}
                  />
                  <Bar yAxisId="right" dataKey="sales" fill="#6366f1" name="Sales Count" radius={[4, 4, 0, 0]} barSize={35} />
                  <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue (₱)" radius={[4, 4, 0, 0]} barSize={35} />
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
      <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Top Performing Products</CardTitle>
          <CardDescription className="text-muted-foreground">Best selling products by revenue</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow className="border-slate-200 dark:border-slate-800">
                  <TableHead className="px-6 py-4">Product</TableHead>
                  <TableHead className="text-right px-6 py-4">Units Sold</TableHead>
                  <TableHead className="text-right px-6 py-4">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="border-slate-200 dark:border-slate-800">
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedTopProducts.length > 0 ? (
                  paginatedTopProducts.map((product, idx) => (
                    <TableRow key={idx} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-foreground">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-right px-6 py-4 text-foreground">{product.sold.toLocaleString()}</TableCell>
                      <TableCell className="text-right px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                        {formatPrice(product.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                      No product data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalTopProductsPages > 1 && (
            <div className="py-4 border-t border-slate-200 dark:border-slate-800">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setTopProductsPage(p => Math.max(1, p - 1))}
                      className={`cursor-pointer ${topProductsPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalTopProductsPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        isActive={topProductsPage === i + 1}
                        onClick={() => setTopProductsPage(i + 1)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setTopProductsPage(p => Math.min(totalTopProductsPages, p + 1))}
                      className={`cursor-pointer ${topProductsPage === totalTopProductsPages ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          {data?.topProducts.some((product) => product.isDeletedProduct) && (
            <p className="px-6 py-3 text-xs text-muted-foreground border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
              * Some products may have been removed from the store
            </p>
          )}
        </CardContent>
      </Card>

      {data && (
        <SalesExportModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          format={exportFormat}
          dateRange={getRelativeDateRangeLabel(range)}
          data={data}
        />
      )}
    </div>
  );
}
