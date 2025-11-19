'use client';

import { Download, Users, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const topCustomers = [
  { name: 'John Smith', email: 'john@example.com', orders: 24, totalSpent: '$2,450', status: 'VIP' },
  { name: 'Sarah Johnson', email: 'sarah@example.com', orders: 18, totalSpent: '$1,890', status: 'Regular' },
  { name: 'Mike Davis', email: 'mike@example.com', orders: 15, totalSpent: '$1,650', status: 'Regular' },
  { name: 'Emily Wilson', email: 'emily@example.com', orders: 12, totalSpent: '$1,320', status: 'Regular' },
];

const customerSegments = [
  { segment: 'VIP Customers', count: 45, avgOrderValue: '$125.50', totalRevenue: '$45,247' },
  { segment: 'Regular Customers', count: 320, avgOrderValue: '$68.30', totalRevenue: '$21,856' },
  { segment: 'New Customers', count: 185, avgOrderValue: '$42.10', totalRevenue: '$7,789' },
];

export default function CustomersReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Reports</h1>
          <p className="text-muted-foreground mt-1">Customer analytics, segments, and insights</p>
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
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">550</div>
            <p className="text-xs text-green-600 mt-1">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">365</div>
            <p className="text-xs text-muted-foreground mt-1">66% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$78.50</div>
            <p className="text-xs text-green-600 mt-1">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$245</div>
            <p className="text-xs text-green-600 mt-1">+8% from last month</p>
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
              {topCustomers.map((customer, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell className="text-green-600 font-medium">{customer.totalSpent}</TableCell>
                  <TableCell>
                    <Badge variant={customer.status === 'VIP' ? 'default' : 'secondary'}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
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
              {customerSegments.map((segment, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{segment.segment}</TableCell>
                  <TableCell>{segment.count}</TableCell>
                  <TableCell>{segment.avgOrderValue}</TableCell>
                  <TableCell className="text-green-600 font-medium">{segment.totalRevenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

