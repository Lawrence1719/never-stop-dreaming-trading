'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, Printer, MoreVertical, Eye, Mail, FileText, X, Loader2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, formatDate } from '@/lib/utils/formatting';
import { OrdersExportModal, ExportMode } from '@/components/admin/orders/OrdersExportModal';

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
  courier?: string | null;
}

export default function OrdersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState({ total: 0, pending: 0, avg: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pageSize] = useState(10);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('pdf-preview');
  const [exportData, setExportData] = useState<any[]>([]);
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
        allOrdersParams.append('limit', '1000'); // Get more for counts
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
        params.append('page', currentPage.toString());
        params.append('limit', pageSize.toString());

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
        setOrders(payload.data || []);
        
        if (payload.pagination) {
          setTotalPages(payload.pagination.totalPages);
          setTotalOrders(payload.pagination.total);
        }
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
  }, [debouncedSearchTerm, orderStatus, currentPage]);

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
  
  const formatAmountDisplay = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : amount;
    return formatPrice(num);
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

  const handleStatusChange = (status: string) => {
    setOrderStatus(status);
    setCurrentPage(1); // Reset to first page
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Error',
          description: 'Session expired. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/admin/orders/${orderToCancel.orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      setCancelDialogOpen(false);
      setOrderToCancel(null);
      toast({
        title: 'Order Cancelled',
        description: `Order ${orderToCancel.id} has been cancelled successfully.`,
        variant: 'success',
      });

      // Refresh orders list
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (orderStatus !== 'all') params.append('status', orderStatus);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
      });

      if (res.ok) {
        const payload = await res.json();
        setOrders(payload.data || []);
      }
    } catch (err) {
      console.error('Failed to cancel order', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const downloadCSV = (rows: string[][], filename: string) => {
    const content = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: 'all' | 'pending' | 'shipped' | 'date-range' | 'accounting' | 'pdf', dateRange?: { from: string, to: string }) => {
    setIsExporting(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          payment_status,
          payment_method,
          user_id,
          profiles:user_id (name, email),
          order_items (quantity)
        `)
        .order('created_at', { ascending: false });

      if (type === 'pending') query = query.eq('status', 'pending');
      if (type === 'shipped') query = query.eq('status', 'shipped');
      if (dateRange) {
        query = query.gte('created_at', `${dateRange.from}T00:00:00`)
                     .lte('created_at', `${dateRange.to}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return;

      const formattedData = data.map(order => {
        const profile = order.profiles as any;
        const itemsCount = (order.order_items as any[] || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
        return {
          id: `#${order.id.slice(0, 8).toUpperCase()}`,
          orderId: order.id,
          customer: profile?.name || 'Guest',
          email: profile?.email || '',
          amount: order.total,
          items: itemsCount,
          orderStatus: order.status,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          date: new Date(order.created_at).toISOString().split('T')[0]
        };
      });

      const today = new Date().toISOString().split('T')[0];

      if (type === 'pdf') {
        setExportData(formattedData);
        setExportMode('pdf-preview');
        setExportModalOpen(true);
        return;
      }

      if (type === 'date-range' && !dateRange) {
        setExportMode('date-range');
        setExportModalOpen(true);
        return;
      }

      // Handle CSV Exports
      let filename = `orders-${type}-${today}.csv`;
      let headers: string[] = [];
      let rows: string[][] = [];

      if (type === 'accounting') {
        filename = `orders-accounting-${today}.csv`;
        headers = ['Order ID', 'Date', 'Customer', 'Payment Method', 'Subtotal', 'Tax (0)', 'Discount', 'Total', 'Payment Status'];
        rows = formattedData.map(o => [
          o.id,
          o.date,
          o.customer,
          o.paymentMethod || 'N/A',
          o.amount.toString(),
          '0',
          '0',
          o.amount.toString(),
          o.paymentStatus
        ]);
      } else {
        if (dateRange) filename = `orders-${dateRange.from}-to-${dateRange.to}.csv`;
        headers = ['Order ID', 'Customer', 'Email', 'Items', 'Amount', 'Order Status', 'Payment Status', 'Payment Method', 'Date'];
        rows = formattedData.map(o => [
          o.id,
          o.customer,
          o.email,
          o.items.toString(),
          `PHP ${Number(o.amount).toFixed(2)}`,
          o.orderStatus,
          o.paymentStatus,
          o.paymentMethod || 'N/A',
          o.date
        ]);
      }

      downloadCSV([headers, ...rows], filename);
      toast({
        title: 'Export Successful',
        description: `Exported ${formattedData.length} orders as CSV.`,
        variant: 'success',
      });

    } catch (err) {
      console.error('Export Error:', err);
      toast({
        title: 'Export Failed',
        description: err instanceof Error ? err.message : 'An error occurred during export.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

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
            <div className="text-2xl font-bold mt-1">{formatPrice(revenue.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">all time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Avg Order Value</div>
            <div className="text-2xl font-bold mt-1">{formatPrice(revenue.avg)}</div>
            <div className="text-xs text-muted-foreground mt-1">per order</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Pending Payment</div>
            <div className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{formatPrice(revenue.pending)}</div>
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
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <Select value={orderStatus} onValueChange={handleStatusChange}>
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
                  <Button variant="outline" className="gap-2" disabled={isExporting}>
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('all')}>Export All as CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pending')}>Export Pending as CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('shipped')}>Export Shipped as CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('date-range')}>Export by Date Range</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('accounting')}>Export for Accounting</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
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
                    onClick={() => handleStatusChange(filter.value)}
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
                  <TableHead>Courier</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, idx) => (
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
                        {formatAmountDisplay(order.amount)}
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
                        {order.courier ? (
                          <Badge variant="outline" className="font-normal">
                            {order.courier}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Auto-assign</span>
                        )}
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
                        {formatDate(order.date)}
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
                            <DropdownMenuItem 
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                setOrderToCancel(order);
                                setCancelDialogOpen(true);
                              }}
                            >
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
              Showing {orders.length} of {totalOrders} order{totalOrders !== 1 ? 's' : ''}
              {orderStatus !== 'all' && ` (filtered by ${statusFilters.find(f => f.value === orderStatus)?.label})`}
            </p>
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order <strong>{orderToCancel?.id}</strong>? 
              This action cannot be undone. The customer will be notified of the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Orders Export Modal */}
      <OrdersExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        mode={exportMode}
        data={exportData}
        onExportCSV={(start, end) => handleExport('date-range', { from: start, to: end })}
      />
    </div>
  );
}
