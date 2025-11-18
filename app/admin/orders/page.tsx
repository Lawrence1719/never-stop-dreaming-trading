'use client';

import { useState } from 'react';
import { Search, Filter, Download, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockOrders = [
  {
    id: '#1024',
    customer: 'John Doe',
    email: 'john@example.com',
    amount: '$124.50',
    items: 2,
    orderStatus: 'delivered',
    paymentStatus: 'paid',
    date: '2024-01-15',
  },
  {
    id: '#1023',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    amount: '$89.99',
    items: 1,
    orderStatus: 'shipped',
    paymentStatus: 'paid',
    date: '2024-01-14',
  },
  {
    id: '#1022',
    customer: 'Bob Johnson',
    email: 'bob@example.com',
    amount: '$245.00',
    items: 3,
    orderStatus: 'processing',
    paymentStatus: 'paid',
    date: '2024-01-14',
  },
  {
    id: '#1021',
    customer: 'Alice Williams',
    email: 'alice@example.com',
    amount: '$156.75',
    items: 2,
    orderStatus: 'pending',
    paymentStatus: 'pending',
    date: '2024-01-13',
  },
];

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');

  const filteredOrders = mockOrders.filter(
    (order) =>
      (searchTerm === '' ||
        order.id.includes(searchTerm) ||
        order.customer.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (orderStatus === 'all' || order.orderStatus === orderStatus)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'pending':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    return status === 'paid' ? 'default' : 'destructive';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and track all customer orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>View all orders and their details</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order # or customer..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium cursor-pointer hover:text-primary">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer}</p>
                        <p className="text-xs text-muted-foreground">{order.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell className="font-medium">{order.amount}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.orderStatus)}>
                        {order.orderStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {filteredOrders.length} of {mockOrders.length} orders
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
