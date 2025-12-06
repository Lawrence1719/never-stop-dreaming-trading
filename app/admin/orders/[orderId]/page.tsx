'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, Loader2, Copy, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAuth } from '@/lib/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils/formatting';

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
  notes: string | null;
  tracking_number: string | null;
  courier: string | null;
}

interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  status: string;
  payment_status: string;
  total: number;
  items: OrderItem[];
  shipping_address: any;
  payment_method: string;
  tracking_number: string | null;
  courier: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  confirmed_by_customer_at: string | null;
  auto_confirmed: boolean;
  created_at: string;
  updated_at: string;
  status_history: StatusHistory[];
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  duplicate: ['cancelled'],
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  duplicate: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const COURIERS = ['2GO', 'LBC', 'Lalamove', 'J&T Express', 'Flash Express', 'Ninja Van', 'Others'];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (orderId && user) {
      fetchOrder();
    }
  }, [orderId, user]);

  // Clear tracking fields when status changes away from 'shipped'
  useEffect(() => {
    if (newStatus !== 'shipped') {
      setTrackingNumber('');
      setCourier('');
    }
  }, [newStatus]);

  // Debug: Log orderId
  useEffect(() => {
    if (orderId) {
      console.log('Order ID from params:', orderId);
    }
  }, [orderId]);

  const fetchOrder = async (resetNewStatus = true) => {
    try {
      setIsLoading(true);
      setError(null);

      // Safety timeout wrapper to avoid hanging during network issues
      const withTimeout = async <T,>(p: Promise<T>, ms = 10000, msg = 'Request timed out') => {
        return await new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(msg)), ms);
          p.then((res) => {
            clearTimeout(timer);
            resolve(res);
          }).catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
        });
      };

      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000, 'Auth session request timed out');
      if (!session) {
        setError('Please log in to view order details');
        return;
      }

      // Timeout wrapper using Promise.race to avoid AbortController errors
      const timeoutMs = 10000;
      const fetchPromise = fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      let response: Response;
      try {
        response = await Promise.race([
          fetchPromise,
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
        ]) as Response;
      } finally {
        // no-op; Promise.race handles timeout rejection without aborting underlying fetch
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data);
      // Only reset newStatus if this is an initial load (resetNewStatus = true)
      // Always set to empty string so user must explicitly select a new status
      if (resetNewStatus) {
        setNewStatus('');
      }
    } catch (err) {
      console.error('Failed to fetch order', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!order || !newStatus) return;

    // Validation: Ensure newStatus is different from current order status
    if (newStatus === order.status) {
      addToast('Please select a different status', 'error');
      return;
    }

    // Validation
    if (newStatus === 'shipped') {
      if (!trackingNumber.trim() || trackingNumber.trim().length < 3) {
        addToast('Tracking number is required for shipped status (minimum 3 characters)', 'error');
        return;
      }
      if (!courier.trim()) {
        addToast('Courier is required for shipped status', 'error');
        return;
      }
    }

    setIsUpdating(true);

    try {
      // Use same timeout wrapper for session
      const withTimeout = async <T,>(p: Promise<T>, ms = 10000, msg = 'Request timed out') => {
        return await new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(msg)), ms);
          p.then((res) => {
            clearTimeout(timer);
            resolve(res);
          }).catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
        });
      };

      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000, 'Auth session request timed out');
      if (!session) {
        throw new Error('Session expired');
      }

      if (!orderId) {
        throw new Error('Order ID is missing');
      }

      console.log('Updating order status:', { orderId, newStatus });

      // Prepare request details and log them for debugging
      const requestUrl = `/api/admin/orders/${orderId}`;
      const requestBody = {
        status: newStatus,
        tracking_number: trackingNumber.trim() || null,
        courier: courier.trim() || null,
        notes: notes.trim() || null,
      };
      console.log('Order update request', { url: requestUrl, method: 'PUT', hasToken: !!session.access_token, body: requestBody });

      // Timeout wrapper using Promise.race to avoid AbortController errors
      const timeoutMs = 10000;
      const fetchPromise = fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });
      let response: Response;
      try {
        response = await Promise.race([
          fetchPromise,
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
        ]) as Response;
      } finally {
        // no-op; Promise.race handles timeout rejection without aborting underlying fetch
      }

      // Parse response robustly: try JSON first via clone(), then fallback to raw text
      let result: any = {};
      try {
        // Try JSON via a clone (safer if the body has been consumed elsewhere)
        result = await response.clone().json().catch(() => ({}));
        if (!result || (Object.keys(result).length === 0)) {
          const text = await response.clone().text().catch(() => '');
          if (text) {
            // Try to parse text as JSON if possible
            try {
              const parsed = JSON.parse(text);
              result = parsed;
            } catch {
              result = { error: text };
            }
          }
        }
      } catch (e) {
        const raw = await response.clone().text().catch(() => '');
        result = { error: raw || `HTTP ${response.status}: ${response.statusText}`, details: e instanceof Error ? e.message : String(e) };
      }

      if (!response.ok) {
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          result,
          url: response.url
        });
        
        const errorMessage = result.error || 
                            result.message || 
                            result.details ||
                            `Failed to update order status (HTTP ${response.status})`;
        
        throw new Error(errorMessage);
      }

      // Refresh order data and get the updated status
      await fetchOrder(false);
      
      // Reset the form after successful update
      setShowConfirmDialog(false);
      setNotes('');
      setTrackingNumber('');
      setCourier('');
      // Reset newStatus to empty string to clear selection
      setNewStatus('');
      setUpdateSuccess(true);
      
      // Show success message
      setSuccessMessage(`Order status updated to ${newStatus}`);
      setUpdateSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => {
        setUpdateSuccess(false);
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Failed to update status', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order status';
      setError(errorMessage);
      // Also show a user-visible alert so admin sees the failure immediately
      try {
        toast({ title: 'Failed to update order', description: errorMessage, variant: 'destructive' });
      } catch {}
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    setIsConfirmingPayment(true);

    try {
      const withTimeout = async <T,>(p: Promise<T>, ms = 10000, msg = 'Request timed out') => {
        return await new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(msg)), ms);
          p.then((res) => {
            clearTimeout(timer);
            resolve(res);
          }).catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
        });
      };

      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000, 'Auth session request timed out');
      if (!session) {
        throw new Error('Session expired');
      }

      const timeoutMs = 10000;
      const fetchPromise = fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      let response: Response;
      try {
        response = await Promise.race([
          fetchPromise,
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
        ]) as Response;
      } finally {
        // no-op
      }

      let result: any = {};
      try {
        result = await response.clone().json().catch(() => ({}));
      } catch (e) {
        const raw = await response.clone().text().catch(() => '');
        result = { error: raw || `HTTP ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to confirm payment';
        throw new Error(errorMessage);
      }

      // Refresh order data
      await fetchOrder(false);
      
      // Show success message
      setSuccessMessage('Payment confirmed successfully');
      setUpdateSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => {
        setUpdateSuccess(false);
        setSuccessMessage('');
      }, 5000);

      toast({ title: 'Success!', description: 'Payment confirmed successfully' });
      
      // Force page reload to ensure UI updates
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Failed to confirm payment', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm payment';
      toast({ title: 'Failed to confirm payment', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const getAvailableStatuses = () => {
    if (!order) return [];
    return ALLOWED_TRANSITIONS[order.status] || [];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || 'Order not found'}</p>
            <Button onClick={() => router.push('/admin/orders')} className="mt-4 w-full">
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableStatuses = getAvailableStatuses();
  const canUpdateStatus = availableStatuses.length > 0 && order.status !== 'delivered' && order.status !== 'cancelled';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-muted-foreground">Created {formatDate(order.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{order.shipping_address.full_name}</p>
                  <p className="text-sm text-muted-foreground">{order.shipping_address.street_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.zip_code}
                  </p>
                  <p className="text-sm text-muted-foreground">Phone: {order.shipping_address.phone}</p>
                  {order.shipping_address.email && (
                    <p className="text-sm text-muted-foreground">Email: {order.shipping_address.email}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
              <CardDescription>Track the progression of this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Initial status - only show if no history or if current status is different from first history entry */}
                {(!order.status_history || order.status_history.length === 0 || 
                  (order.status_history.length > 0 && order.status_history[0].new_status !== order.status)) && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                        {getStatusIcon(order.status)}
                      </div>
                      {order.status_history && order.status_history.length > 0 && (
                        <div className="w-0.5 h-6 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">{order.status}</span>
                        <StatusBadge status={order.status} showIcon={false} className="text-xs" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(() => {
                          const statusDescriptions: Record<string, string> = {
                            pending: 'Order created and waiting for payment/approval',
                            paid: 'Payment confirmed and order approved',
                            processing: 'Order is being prepared for shipment',
                            shipped: 'Order has been shipped and is in transit',
                            delivered: 'Order has been delivered to customer',
                            cancelled: 'Order has been cancelled',
                            duplicate: 'Duplicate order detected and marked',
                          };
                          return statusDescriptions[order.status.toLowerCase()] || 'Order status updated';
                        })()}
                      </p>
                      {availableStatuses.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Next step likely: {availableStatuses[0]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Status history */}
                {order.status_history && order.status_history.map((history, index) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${STATUS_COLORS[history.new_status] || 'bg-gray-100'}`}>
                        {getStatusIcon(history.new_status)}
                      </div>
                      {index < order.status_history.length - 1 && (
                        <div className="w-0.5 h-6 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">{history.new_status}</span>
                        {history.old_status && (
                          <span className="text-xs text-muted-foreground">
                            (from {history.old_status})
                          </span>
                        )}
                        <StatusBadge status={history.new_status} showIcon={false} className="text-xs" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(history.changed_at)}
                      </p>
                      {history.new_status === 'paid' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Payment confirmed by admin
                        </p>
                      )}
                      {history.new_status === 'processing' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Ready to prepare for shipment
                        </p>
                      )}
                      {history.new_status === 'shipped' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Package handed to courier
                        </p>
                      )}
                      {history.tracking_number && (
                        <p className="text-sm mt-2">
                          <span className="font-medium">Tracking:</span>{' '}
                          <span className="font-mono">{history.tracking_number}</span>
                          {history.courier && ` (${history.courier})`}
                        </p>
                      )}
                      {history.notes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">{history.notes}</p>
                      )}
                      {index === order.status_history.length - 1 && availableStatuses.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Next step: {availableStatuses[0]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{order.customer.name}</p>
                <p className="text-sm text-muted-foreground">{order.customer.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Method</Label>
                <p className="font-medium capitalize">{order.payment_method}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Status</Label>
                <div className="mt-1">
                  <Badge 
                    variant={order.payment_status === 'paid' ? 'default' : 'destructive'}
                    className={
                      order.payment_status === 'paid' 
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-600 dark:text-white font-medium rounded-full px-3' 
                        : 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:text-white font-medium rounded-full px-3'
                    }
                  >
                    {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Current Status</Label>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Since {formatDate(order.created_at)}
                </p>
              </div>
              {order.paid_at && (
                <div>
                  <Label className="text-muted-foreground">Paid At</Label>
                  <p className="text-sm">{formatDate(order.paid_at)}</p>
                </div>
              )}
              {order.shipped_at && (
                <div>
                  <Label className="text-muted-foreground">Shipped At</Label>
                  <p className="text-sm">{formatDate(order.shipped_at)}</p>
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <Label className="text-muted-foreground">Delivered At</Label>
                  <p className="text-sm">{formatDate(order.delivered_at)}</p>
                </div>
              )}
              {order.tracking_number && (
                <div>
                  <Label className="text-muted-foreground">Tracking Number</Label>
                  <p className="font-mono text-sm">{order.tracking_number}</p>
                  {order.courier && <p className="text-xs text-muted-foreground">{order.courier}</p>}
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <Label className="text-muted-foreground">Customer Confirmation</Label>
                  {order.confirmed_by_customer_at ? (
                    <div className="mt-1">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        ✓ {order.auto_confirmed ? 'Auto-confirmed' : 'Confirmed'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(order.confirmed_by_customer_at)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                        ⏳ Pending
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Awaiting customer confirmation
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* COD Payment Pending Warning & Confirm Button */}
          {order.payment_method === 'cod' && order.payment_status === 'pending' && ['delivered', 'completed'].includes(order.status) && (
            <Card className="border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                      COD Payment Pending
                    </CardTitle>
                    <CardDescription className="text-orange-600 dark:text-orange-500">
                      Cash payment has not been confirmed yet
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                  <p className="text-sm text-orange-900 dark:text-orange-300 font-medium mb-2">
                    Order Status: <span className="capitalize">{order.status}</span>
                  </p>
                  {order.delivered_at && (
                    <p className="text-sm text-orange-800 dark:text-orange-400">
                      Delivered on {formatDate(order.delivered_at)}
                    </p>
                  )}
                  <p className="text-sm text-orange-800 dark:text-orange-400 mt-2">
                    Confirm payment once cash has been collected from the customer.
                  </p>
                </div>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={isConfirmingPayment}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  {isConfirmingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Payment Received
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Status Update */}
          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Order Status</CardTitle>
                <CardDescription>Change order status and add tracking information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Current Status</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <StatusBadge status={order.status} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Since {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">Change To</Label>
                  {newStatus && newStatus !== order.status && (
                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                        Selected: <span className="capitalize font-bold">{newStatus}</span>
                      </p>
                    </div>
                  )}
                  <RadioGroup value={newStatus} onValueChange={setNewStatus} className="mt-2 space-y-2">
                    {availableStatuses.map((status) => {
                      const descriptions: Record<string, string> = {
                        paid: 'Payment received',
                        processing: 'Preparing to ship',
                        shipped: 'In transit with courier',
                        delivered: 'Customer received',
                        cancelled: 'Cancel this order',
                      };
                      const isSelected = newStatus === status;
                      return (
                        <label 
                          key={status} 
                          htmlFor={status}
                          className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-500/20 border-blue-500 shadow-md' 
                              : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                          }`}
                        >
                          <RadioGroupItem value={status} id={status} className="mt-0.5" />
                          <div className="flex-1">
                            <span className={`capitalize ${isSelected ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'}`}>
                              {status}
                              {isSelected && ' ✓'}
                            </span>
                            {descriptions[status] && (
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {descriptions[status]}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>

                {newStatus === 'shipped' && (
                  <>
                    <div>
                      <Label htmlFor="courier">Courier *</Label>
                      <Select value={courier} onValueChange={setCourier}>
                        <SelectTrigger id="courier">
                          <SelectValue placeholder="Select courier" />
                        </SelectTrigger>
                        <SelectContent>
                          {COURIERS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tracking">Tracking Number *</Label>
                      <Input
                        id="tracking"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number"
                        minLength={3}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this status change..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setNewStatus(order.status);
                      setTrackingNumber('');
                      setCourier('');
                      setNotes('');
                    }}
                    variant="outline"
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isUpdating || newStatus === order.status}
                    className="flex-1"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Status'
                    )}
                  </Button>
                </div>
                
                {updateSuccess && successMessage && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg animate-in slide-in-from-top">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        {successMessage}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!canUpdateStatus && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  This order cannot be updated further.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Confirm Status Update</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Are you sure you want to change the order status from{' '}
                <span className="font-semibold capitalize">{order.status}</span> to{' '}
                <span className="font-semibold capitalize">{newStatus}</span>?
              </p>
              {newStatus === 'shipped' && trackingNumber && (
                <p className="text-sm text-muted-foreground mb-4">
                  Tracking: {trackingNumber} ({courier})
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate} disabled={isUpdating} className="flex-1">
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

