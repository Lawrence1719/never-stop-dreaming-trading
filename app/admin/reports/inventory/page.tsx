'use client';

import { Download, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const lowStockItems = [
  { name: 'Trading Course Workbook', sku: 'TCW-001', stock: 5, threshold: 20, status: 'critical' },
  { name: 'Market Analysis Software', sku: 'MAS-002', stock: 12, threshold: 25, status: 'low' },
  { name: 'Portfolio Management Tool', sku: 'PMT-003', stock: 8, threshold: 15, status: 'critical' },
  { name: 'Trading Journal Premium', sku: 'TJP-004', stock: 18, threshold: 30, status: 'low' },
];

const inventoryByCategory = [
  { category: 'Software', total: 450, inStock: 420, lowStock: 25, outOfStock: 5 },
  { category: 'Education', total: 320, inStock: 295, lowStock: 20, outOfStock: 5 },
  { category: 'Subscriptions', total: 180, inStock: 175, lowStock: 5, outOfStock: 0 },
];

export default function InventoryReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
          <p className="text-muted-foreground mt-1">Stock levels, alerts, and inventory analytics</p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">950</div>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">890</div>
            <p className="text-xs text-green-600 mt-1">93.7% availability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">50</div>
            <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">10</div>
            <p className="text-xs text-red-600 mt-1">Needs restocking</p>
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
                <TableHead>SKU</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{item.threshold}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'critical' ? 'destructive' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
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
              {inventoryByCategory.map((category, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{category.category}</TableCell>
                  <TableCell>{category.total}</TableCell>
                  <TableCell className="text-green-600">{category.inStock}</TableCell>
                  <TableCell className="text-yellow-600">{category.lowStock}</TableCell>
                  <TableCell className="text-red-600">{category.outOfStock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

