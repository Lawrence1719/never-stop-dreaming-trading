'use client';

import { useState, useEffect } from 'react';
import { Download, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { exportToCSV } from '@/lib/utils/export';

import { ExportReportModal } from '@/components/admin/reports/ExportReportModal';

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

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch('/api/admin/reports/inventory');

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
  }, []);

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
          <p className="text-muted-foreground mt-1">Stock levels, alerts, and inventory analytics</p>
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
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{data ? data.summary.totalProducts : 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{data ? data.summary.inStock : 0}</div>
                <p className="text-xs text-green-600 mt-1">{data ? `${data.summary.inStockPercentage}% availability` : 'N/A'}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">{data ? data.summary.lowStock : 0}</div>
                <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{data ? data.summary.outOfStock : 0}</div>
                <p className="text-xs text-red-600 mt-1">Needs restocking</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription>Products that need immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`loading-${idx}`} className="animate-pulse">
                    <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                  </TableRow>
                ))
              ) : data && data.lowStockItems.length > 0 ? (
                data.lowStockItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {item.variant || 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="text-right font-medium">{item.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.threshold}</TableCell>
                    <TableCell>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No low stock items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
        />
      )}
    </div>
  );
}

