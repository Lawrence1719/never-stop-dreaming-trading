'use client';

import { Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const salesByCategory = [
  { category: 'Electronics', sales: 4200, revenue: 84000 },
  { category: 'Clothing', sales: 3200, revenue: 48000 },
  { category: 'Books', sales: 2400, revenue: 24000 },
  { category: 'Accessories', sales: 2210, revenue: 22100 },
];

const topProducts = [
  { name: 'Wireless Headphones', sold: 245, revenue: '$31,885' },
  { name: 'USB-C Cable', sold: 890, revenue: '$8,901' },
  { name: 'Phone Stand', sold: 456, revenue: '$9,124' },
  { name: 'Laptop Bag', sold: 234, revenue: '$11,666' },
];

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive sales analytics and insights</p>
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
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$178,101</div>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,056</div>
            <p className="text-xs text-green-600 mt-1">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$14.76</div>
            <p className="text-xs text-red-600 mt-1">-2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.24%</div>
            <p className="text-xs text-green-600 mt-1">+0.5% from last month</p>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
              <XAxis stroke="rgb(var(--color-muted-foreground))" />
              <YAxis stroke="rgb(var(--color-muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--color-card))', border: '1px solid rgb(var(--color-border))' }} />
              <Legend />
              <Bar dataKey="sales" fill="#3b82f6" />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
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
              {topProducts.map((product, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sold}</TableCell>
                  <TableCell className="text-green-600 font-medium">{product.revenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
