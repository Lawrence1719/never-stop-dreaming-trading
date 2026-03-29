'use client';

import { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { exportToCSV } from '@/lib/utils/export';
import { formatPrice } from '@/lib/utils/formatting';

import { ExportReportModal } from '@/components/admin/reports/ExportReportModal';

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

export default function CustomersReportPage() {
  const [data, setData] = useState<CustomerReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch('/api/admin/reports/customers');

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
  }, []);

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const formatAmount = (value: number | string) =>
    formatPrice(typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Reports</h1>
          <p className="text-muted-foreground mt-1">Customer analytics, segments, and insights</p>
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
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
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
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
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
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
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
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
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
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>Highest value customers by total spending</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`loading-${idx}`} className="animate-pulse">
                    <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                  </TableRow>
                ))
              ) : data && data.topCustomers.length > 0 ? (
                data.topCustomers.map((customer, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                    <TableCell>{customer.orders}</TableCell>
                    <TableCell className="text-green-600 font-medium">{formatAmount(customer.totalSpent)}</TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'VIP' ? 'default' : 'secondary'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No customer data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
        />
      )}
    </div>
  );
}

