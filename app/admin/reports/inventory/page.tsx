'use client';

import { useState, useEffect } from 'react';
import { Download, Package, AlertTriangle, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ExportReportModal } from '@/components/admin/reports/ExportReportModal';
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

interface InventoryReport {
  summary: {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    inStockPercentage: string;
  };
  lowStockItems: Array<{
    name: string;
    variant?: string;
    sku: string;
    stock: number;
    threshold: number;
    status: 'critical' | 'low';
  }>;
  inventoryByCategory: Array<{
    category: string;
    total: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  }>;
}

export default function InventoryReportPage() {
  const [data, setData] = useState<InventoryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'all'>('all');

  // Pagination states
  const [lowStockPage, setLowStockPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      setLowStockPage(1); // Reset page on range change
      
      try {
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = now;

        if (range === 'day') {
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (range === 'week') {
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === 'month') {
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          start = null;
          end = null;
        }

        const params = new URLSearchParams();
        if (start) params.append('start', start.toISOString());
        if (end) params.append('end', end.toISOString());

        const res = await fetch(`/api/admin/reports/inventory?${params.toString()}`);

        if (!res.ok) {
          throw new Error('Failed to load inventory report');
        }

        const reportData = await res.json();
        setData(reportData);
      } catch (err) {
        console.error('Failed to load inventory report', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory report');
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

  // Pagination logic for Low Stock Items
  const paginatedLowStock = data?.lowStockItems.slice(
    (lowStockPage - 1) * itemsPerPage,
    lowStockPage * itemsPerPage
  ) || [];
  const totalLowStockPages = Math.ceil((data?.lowStockItems.length || 0) / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory Reports</h1>
          <p className="text-muted-foreground mt-1">Stock levels, alerts, and inventory analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800">
                {range === 'day' ? 'Last 24 Hours' : 
                 range === 'week' ? 'Last 7 Days' : 
                 range === 'month' ? 'Last 30 Days' : 'All Time'}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-slate-200 dark:border-slate-800">
              <DropdownMenuItem onClick={() => setRange('day')} className="cursor-pointer">Last 24 Hours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange('week')} className="cursor-pointer">Last 7 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange('month')} className="cursor-pointer">Last 30 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRange('all')} className="cursor-pointer">All Time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || !data}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-slate-200 dark:border-slate-800">
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
        <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">{data ? data.summary.totalProducts : 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data ? data.summary.inStock : 0}</div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{data ? `${data.summary.inStockPercentage}% availability` : 'N/A'}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-500">{data ? data.summary.lowStock : 0}</div>
                <p className="text-xs text-amber-500 mt-1 font-medium">Requires attention</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-rose-500">{data ? data.summary.outOfStock : 0}</div>
                <p className="text-xs text-rose-500 mt-1 font-medium">Needs restocking</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription className="text-muted-foreground">Products that need immediate attention</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow className="border-slate-200 dark:border-slate-800">
                  <TableHead className="px-6 py-4">Product Name</TableHead>
                  <TableHead className="px-6 py-4">Variant</TableHead>
                  <TableHead className="px-6 py-4">SKU</TableHead>
                  <TableHead className="text-right px-6 py-4">Current Stock</TableHead>
                  <TableHead className="text-right px-6 py-4">Threshold</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="border-slate-200 dark:border-slate-800">
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedLowStock.length > 0 ? (
                  paginatedLowStock.map((item, idx) => (
                    <TableRow key={idx} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="font-normal border-slate-200 dark:border-slate-800">
                          {item.variant || 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-mono text-muted-foreground">{item.sku}</TableCell>
                      <TableCell className="text-right px-6 py-4 font-medium text-foreground">{item.stock}</TableCell>
                      <TableCell className="text-right px-6 py-4 text-muted-foreground">{item.threshold}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge 
                          variant={item.status === 'critical' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No low stock items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalLowStockPages > 1 && (
            <div className="py-4 border-t border-slate-200 dark:border-slate-800">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                      className={`cursor-pointer ${lowStockPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalLowStockPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        isActive={lowStockPage === i + 1}
                        onClick={() => setLowStockPage(i + 1)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setLowStockPage(p => Math.min(totalLowStockPages, p + 1))}
                      className={`cursor-pointer ${lowStockPage === totalLowStockPages ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Inventory by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory by Category</CardTitle>
          <CardDescription>Stock distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Total Products</TableHead>
                <TableHead>In Stock</TableHead>
                <TableHead>Low Stock</TableHead>
                <TableHead>Out of Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <TableRow key={`loading-${idx}`} className="animate-pulse">
                    <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                  </TableRow>
                ))
              ) : data && data.inventoryByCategory.length > 0 ? (
                data.inventoryByCategory.map((category, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{category.category}</TableCell>
                    <TableCell>{category.total}</TableCell>
                    <TableCell className="text-green-600">{category.inStock}</TableCell>
                    <TableCell className="text-yellow-600">{category.lowStock}</TableCell>
                    <TableCell className="text-red-600">{category.outOfStock}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No category data available
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
          reportType="inventory"
          data={data}
          initialFormat={exportFormat}
        />
      )}
    </div>
  );
}
