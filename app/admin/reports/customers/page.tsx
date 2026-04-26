'use client';

import { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, DollarSign, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPrice } from '@/lib/utils/formatting';

import { ExportReportModal } from '@/components/admin/reports/ExportReportModal';
import { DateRangePicker } from '@/components/admin/reports/DateRangePicker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CustomerReport {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    avgOrderValue: number;
    customerLifetimeValue: number;
  };
  topCustomers: Array<{
    name: string;
    email: string;
    orders: number;
    totalSpent: string;
    status: string;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    avgOrderValue: string;
    totalRevenue: string;
  }>;
}

function renderEntityLabel(value: string) {
  const match = value.match(/^(.*?)(\s\((?:Removed|Deleted Account)\))$/);
  if (!match) return value;

  return (
    <>
      {match[1]}
      <span className="text-muted-foreground italic">{match[2]}</span>
    </>
  );
}

export default function CustomersReportPage() {
  const [data, setData] = useState<CustomerReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // Pagination states
  const [topCustomersPage, setTopCustomersPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      setTopCustomersPage(1); // Reset page on range change
      
      try {
        const params = new URLSearchParams();
        if (dateRange.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);

        const res = await fetch(`/api/admin/reports/customers?${params.toString()}`);

        if (!res.ok) {
          throw new Error('Failed to load customer report');
        }

        const reportData = await res.json();
        setData(reportData);
      } catch (err) {
        console.error('Failed to load customer report', err);
        setError(err instanceof Error ? err.message : 'Failed to load customer report');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [dateRange]);

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  const formatAmount = (value: number | string) =>
    formatPrice(typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value);

  // Pagination logic for Top Customers
  const paginatedTopCustomers = data?.topCustomers.slice(
    (topCustomersPage - 1) * itemsPerPage,
    topCustomersPage * itemsPerPage
  ) || [];
  const totalTopCustomersPages = Math.ceil((data?.topCustomers.length || 0) / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Reports</h1>
          <p className="text-muted-foreground mt-1">Customer analytics, segments, and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-2">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data ? data.summary.totalCustomers : 0}</div>
                <p className="text-xs text-muted-foreground mt-1">All registered customers</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? data.summary.activeCustomers : 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data ? `${((data.summary.activeCustomers / data.summary.totalCustomers) * 100).toFixed(1)}% of total` : 'N/A'}
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
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? formatPrice(data.summary.avgOrderValue) : formatPrice(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average per order</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? formatPrice(data.summary.customerLifetimeValue) : formatPrice(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average per customer</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Top Customers</CardTitle>
          <CardDescription className="text-muted-foreground">Highest value customers by total spending</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow className="border-slate-200 dark:border-slate-800">
                  <TableHead className="px-6 py-4">Customer Name</TableHead>
                  <TableHead className="px-6 py-4">Email</TableHead>
                  <TableHead className="px-6 py-4">Total Orders</TableHead>
                  <TableHead className="px-6 py-4">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="border-slate-200 dark:border-slate-800 animate-pulse">
                      <TableCell className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell className="px-6 py-4"><div className="h-4 bg-muted rounded w-32" /></TableCell>
                      <TableCell className="px-6 py-4"><div className="h-4 bg-muted rounded w-12" /></TableCell>
                      <TableCell className="px-6 py-4"><div className="h-4 bg-muted rounded w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedTopCustomers.length > 0 ? (
                  paginatedTopCustomers.map((customer, idx) => (
                    <TableRow key={idx} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-foreground">{renderEntityLabel(customer.name)}</TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">{customer.email}</TableCell>
                      <TableCell className="px-6 py-4 text-foreground">{customer.orders}</TableCell>
                      <TableCell className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">{formatAmount(customer.totalSpent)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                      No customer data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalTopCustomersPages > 1 && (
            <div className="py-4 border-t border-slate-200 dark:border-slate-800">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setTopCustomersPage(p => Math.max(1, p - 1))}
                      className={`cursor-pointer ${topCustomersPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalTopCustomersPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        isActive={topCustomersPage === i + 1}
                        onClick={() => setTopCustomersPage(i + 1)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setTopCustomersPage(p => Math.min(totalTopCustomersPages, p + 1))}
                      className={`cursor-pointer ${topCustomersPage === totalTopCustomersPages ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>Customer distribution by segment</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Customer Count</TableHead>
                <TableHead>Avg. Order Value</TableHead>
                <TableHead>Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <TableRow key={`loading-${idx}`} className="animate-pulse">
                    <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  </TableRow>
                ))
              ) : data && data.customerSegments.length > 0 ? (
                data.customerSegments.map((segment, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{segment.segment}</TableCell>
                    <TableCell>{segment.count}</TableCell>
                    <TableCell>{formatAmount(segment.avgOrderValue)}</TableCell>
                    <TableCell className="text-green-600 font-medium">{formatAmount(segment.totalRevenue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No segment data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data && (
        <ExportReportModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          reportType="customers"
          data={data}
          initialFormat={exportFormat}
        />
      )}
    </div>
  );
}
