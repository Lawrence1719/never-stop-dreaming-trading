'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, Printer, MoreVertical, Eye, Mail, FileText, X } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/admin/status-badge';
import { supabase } from '@/lib/supabase/client';

interface Order {
  id: string;
  orderId: string;
  customer: string;
  email: string;
  amount: string;
  items: number;
  orderStatus: string;
  paymentStatus: string;
  date: string;
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState({ total: 0, pending: 0, avg: 0 });
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    
    async function fetchOrders() {
      setIsLoading(true);
      setError(null);
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Fetch ALL orders first to calculate counts (without status filter)
        const allOrdersParams = new URLSearchParams();
        if (debouncedSearchTerm) allOrdersParams.append('search', debouncedSearchTerm);
        // Don't add status filter here - we want all orders for counts

        const allOrdersRes = await fetch(`/api/admin/orders?${allOrdersParams.toString()}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        if (!allOrdersRes.ok) {
          const payload = await allOrdersRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load orders');
        }

        const allOrdersPayload = await allOrdersRes.json();
        const allOrdersData = allOrdersPayload.data || [];
        
        // Calculate status counts from ALL orders
        const counts: Record<string, number> = {
          all: allOrdersData.length,
          pending: 0,
          paid: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          completed: 0,
          cancelled: 0,
          duplicate: 0,
        };
        
        let totalRevenue = 0;
        let pendingRevenue = 0;
        
        allOrdersData.forEach((order: Order) => {
          const status = order.orderStatus.toLowerCase();
          if (counts[status] !== undefined) {
            counts[status]++;
          }
          
          // Calculate revenue
          const amount = parseFloat(order.amount.replace('₱', '').replace(',', ''));
          totalRevenue += amount;
          if (order.paymentStatus === 'pending') {
            pendingRevenue += amount;
          }
        });
        
        setStatusCounts(counts);
        setRevenue({
          total: totalRevenue,
          pending: pendingRevenue,
          avg: allOrdersData.length > 0 ? totalRevenue / allOrdersData.length : 0,
        });

        // Now fetch filtered orders for display
        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        if (orderStatus !== 'all') params.append('status', orderStatus);

        const res = await fetch(`/api/admin/orders?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load orders');
        }

        const payload = await res.json();
        const ordersData = payload.data || [];
        setOrders(ordersData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to load orders', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setOrders([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchOrders();

    return () => controller.abort();
  }, [debouncedSearchTerm, orderStatus]);

  const getPaymentStatusColor = (status: string) => {
    if (status === 'paid') {
      return 'default';
    }
    // For pending payments, use warning/orange color
    return 'destructive';
  };

  const getPaymentStatusBadge = (status: string) => {
    const isPaid = status === 'paid';
    return (
      <Badge 
        variant={isPaid ? 'default' : 'destructive'}
        className={
          isPaid
            ? 'bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-600 dark:text-white font-medium rounded-full px-3'
            : 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:text-white font-medium rounded-full px-3'
        }
      >
        {isPaid ? 'Paid' : 'Pending'}
      </Badge>
    );
  };
  
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'duplicate', label: 'Duplicate' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and track all customer orders</p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold mt-1">{statusCounts.all || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(revenue.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">all time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Avg Order Value</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(revenue.avg)}</div>
            <div className="text-xs text-muted-foreground mt-1">per order</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Pending Payment</div>
            <div className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{formatCurrency(revenue.pending)}</div>
            <div className="text-xs text-muted-foreground mt-1">{statusCounts.pending || 0} orders</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>View all orders and their details</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
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
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Export All as CSV</DropdownMenuItem>
                  <DropdownMenuItem>Export Pending as CSV</DropdownMenuItem>
                  <DropdownMenuItem>Export Shipped as CSV</DropdownMenuItem>
                  <DropdownMenuItem>Export by Date Range</DropdownMenuItem>
                  <DropdownMenuItem>Export for Accounting</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => {
                const count = statusCounts[filter.value] || 0;
                const isActive = orderStatus === filter.value;
                return (
                  <Button
                    key={filter.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrderStatus(filter.value)}
                    className="h-8"
                  >
                    {filter.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                        {count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

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
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-32" />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-8" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow 
                      key={order.orderId}
                      className="hover:bg-muted/50"
                    >
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-primary"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        {order.id}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        <div>
                          <p className="font-medium">{order.customer}</p>
                          <p className="text-xs text-muted-foreground">{order.email}</p>
                        </div>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        {order.items}
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        {order.amount}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        <StatusBadge status={order.orderStatus} />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </TableCell>
                      <TableCell 
                        className="text-sm text-muted-foreground cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.orderId}`}
                      >
                        {order.date}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/admin/orders/${order.orderId}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/admin/orders/${order.orderId}`}>
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              Print Label
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 dark:text-red-400">
                              <X className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
              {orderStatus !== 'all' && ` (filtered by ${statusFilters.find(f => f.value === orderStatus)?.label})`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
