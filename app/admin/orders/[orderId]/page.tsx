'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, Loader2, Copy, Mail, Phone, MapPin, AlertCircle, Image as ImageIcon, User, AlertTriangle } from 'lucide-react';
import { ProductImage } from '@/components/shared/ProductImage';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ProofOfDeliveryModal } from '@/components/admin/ProofOfDeliveryModal';

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
  orderNumber: string;
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
  assigned_courier_id: string | null;
  assigned_courier_name?: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  confirmed_by_customer_at: string | null;
  auto_confirmed: boolean;
  discount_amount?: number;
  shipping_cost?: number;
  created_at: string;
  updated_at: string;
  status_history: StatusHistory[];
}

function renderEntityLabel(value: string) {
  const match = value.match(/^(.*?)(\s\((?:Removed|Deleted Account)\))$/);
  if (!match) return value;

  return (
    <>
      {match[1]}
      <span className="text-muted-foreground italic">{match[2]}</span>
    </>
  );
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

const COURIERS = ['NSD Delivery'];

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
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState<{id: string, name: string}[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('auto');
  const [showProofModal, setShowProofModal] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [courierDeliveryFailed, setCourierDeliveryFailed] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      // Fetch exactly once on mount; fetchOrder manages session
      fetchOrder(true);
      fetchAvailableCouriers();
    }
  }, [orderId]);

  // Check for failed courier delivery
  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('courier_deliveries')
      .select('status')
      .eq('order_id', orderId)
      .eq('status', 'failed')
      .maybeSingle()
      .then(({ data }) => {
        setCourierDeliveryFailed(!!data);
      });
  }, [orderId]);

  const fetchAvailableCouriers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'courier');
    
    if (data) setAvailableCouriers(data);
  };

  // Auto-generate tracking number when status changes to 'shipped'
  useEffect(() => {
    if (newStatus === 'shipped' && !trackingNumber) {
      // Auto-generate tracking number: NSD-{DATE}-{ORDER_ID}-{RANDOM}
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const orderNumberClean = order?.orderNumber.replace('#', '') || '';
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const autoTrackingNumber = `NSD-${date}-${orderNumberClean}-${random}`;
      setTrackingNumber(autoTrackingNumber);
      // Set default courier to in-house delivery
      if (!courier) {
        setCourier('NSD Delivery');
      }
    } else if (newStatus !== 'shipped') {
      setTrackingNumber('');
      setCourier('');
      setSelectedCourierId('auto');
    }
  }, [newStatus]); // removed order?.id to prevent resets on data refresh

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
      // Only reset newStatus if this is an initial load AND it's currently empty
      if (resetNewStatus && !newStatus) {
        setNewStatus('');
      }
    } catch (err) {
      console.error('Failed to fetch order', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (isManualOverride: boolean = false) => {
    if (!order || !newStatus) return;

    // Validation: Ensure newStatus is different from current order status
    if (newStatus === order.status) {
      toast({ title: 'Error', description: 'Please select a different status', variant: 'destructive' });
      return;
    }

    // Validation
    if (newStatus === 'shipped') {
      if (!trackingNumber.trim() || trackingNumber.trim().length < 3) {
        toast({ title: 'Error', description: 'Tracking number is required for shipped status (minimum 3 characters)', variant: 'destructive' });
        return;
      }
      if (!courier.trim()) {
        toast({ title: 'Error', description: 'Courier is required for shipped status', variant: 'destructive' });
        return;
      }
    }

    // NEW: Check for proof of delivery before updating
    if (newStatus === 'delivered' && !isManualOverride) {
      setIsUpdating(true); // show generic loading briefly
      try {
        const { data: proofData, error: proofError } = await supabase
          .from('courier_deliveries')
          .select('proof_image_url, status')
          .eq('order_id', orderId)
          .maybeSingle();
        
        if (proofError) throw proofError;
        
        if (!proofData || proofData.status !== 'delivered' || !proofData.proof_image_url) {
           setIsUpdating(false);
           setShowConfirmDialog(false); // Close standard dialog if open
           setShowOverrideDialog(true);
           return;
        }
      } catch (err) {
        console.error('Failed to check courier proof:', err);
        // On error, let admin proceed with override check anyway to avoid blocking
        setIsUpdating(false);
        setShowConfirmDialog(false);
        setShowOverrideDialog(true);
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
        courier_id: selectedCourierId === 'auto' ? null : selectedCourierId,
        isManualOverride
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
      
      const appliedStatus = newStatus;
      
      // Reset the form after successful update
      setShowConfirmDialog(false);
      setShowOverrideDialog(false);
      setNotes('');
      setTrackingNumber('');
      setCourier('');
      setSelectedCourierId('auto');
      // Reset newStatus to empty string to clear selection
      setNewStatus('');
      
      toast({ 
        title: 'Success', 
        description: `Order ${order.orderNumber} updated to ${appliedStatus}`,
        variant: 'success'
      });
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
      
      toast({ 
        title: 'Success!', 
        description: 'Payment confirmed successfully',
        variant: 'success'
      });
      
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
    return <OrderDetailsSkeleton />;
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
  const canUpdateStatus = availableStatuses.length > 0 && order.status !== 'cancelled';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
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
                  <div key={index} className={`flex gap-4 pb-4 ${index > 0 ? 'pt-4 border-t' : ''}`}>
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <ProductImage 
                          src={item.image.startsWith('http') || item.image.startsWith('/') 
                            ? item.image 
                            : supabase.storage.from('product-images').getPublicUrl(item.image).data.publicUrl} 
                          alt={item.name} 
                        />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{renderEntityLabel(item.name)}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPrice(order.total - (order.shipping_cost || 0) + (order.discount_amount || 0))}</span>
                  </div>
                  {order.discount_amount && order.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">{(order.shipping_cost === 0 || !order.shipping_cost) ? 'FREE' : formatPrice(order.shipping_cost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
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
                {/* Status history with deduplication */}
                {(() => {
                  if (!order.status_history) return null;
                  
                  // Sort by date descending
                  const sorted = [...order.status_history].sort((a, b) => 
                    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
                  );

                  // Deduplicate consecutive same statuses
                  const deduped: StatusHistory[] = [];
                  sorted.forEach((item) => {
                    const existing = deduped.find(d => d.new_status === item.new_status);
                    if (existing) {
                      // Merge notes if they are different
                      if (item.notes && existing.notes !== item.notes) {
                        if (!existing.notes) existing.notes = item.notes;
                        else if (!existing.notes.includes(item.notes)) {
                          existing.notes = `${existing.notes}. ${item.notes}`;
                        }
                      }
                      // Merge tracking info
                      if (item.tracking_number && !existing.tracking_number) {
                        existing.tracking_number = item.tracking_number;
                      }
                      if (item.courier && !existing.courier) {
                        existing.courier = item.courier;
                      }
                      // Keep the earliest changed_at for the step initiation? 
                      // Or the latest for the status achievement? 
                      // Usually timeline shows when it was achieved.
                    } else {
                      deduped.push({ ...item });
                    }
                  });

                  return deduped.map((history, index, sortedHistory) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${STATUS_COLORS[history.new_status] || 'bg-gray-100'}`}>
                        {getStatusIcon(history.new_status)}
                      </div>
                      {index < sortedHistory.length - 1 && (
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
                        <div className="mt-1">
                          {history.new_status === 'cancelled' && history.notes.startsWith('Cancellation reason:') ? (
                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 p-3 rounded-xl mt-2 text-sm">
                              <p className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2 mb-1">
                                <span>📝</span> Reason for Cancellation
                              </p>
                              <p className="text-muted-foreground italic">
                                &ldquo;{history.notes.split('Cancellation reason: ')[1]?.split('.')[0]}&rdquo;
                              </p>
                              {history.notes.includes('Customer note:') && (
                                <div className="mt-2 pt-2 border-t border-rose-200/50 dark:border-rose-800/50">
                                  <p className="text-xs font-bold text-rose-600/70 dark:text-rose-500/70 uppercase tracking-widest mb-1">Customer Note</p>
                                  <p className="text-muted-foreground">{history.notes.split('Customer note: ')[1]}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground italic">{history.notes}</p>
                              {history.notes.includes('Manually confirmed') && (
                                <Badge variant="destructive" className="mt-2 text-[10px] px-2 py-0.5 opacity-80 border-red-500/50 inline-flex items-center gap-1 font-semibold">
                                  🔴 Manually Confirmed by Admin
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {index === 0 && availableStatuses.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Next step: {availableStatuses[0]}
                        </p>
                      )}
                    </div>
                  </div>
                ));
              })()}
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
                <p className="font-medium">{renderEntityLabel(order.customer.name)}</p>
                <p className="text-sm text-muted-foreground">{order.customer.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Method</Label>
                <p className="font-medium">
                  {order.payment_method?.toUpperCase() === 'COD' ? 'COD' : <span className="capitalize">{order.payment_method}</span>}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Status</Label>
                <div className="mt-1">
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'}>
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
                  Since {formatDate(order.status_history && order.status_history.length > 0 
                    ? order.status_history.reduce((latest, current) => 
                        new Date(latest.changed_at) > new Date(current.changed_at) ? latest : current
                      ).changed_at 
                    : order.created_at)}
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
              {order.assigned_courier_name && (
                <div>
                  <Label className="text-muted-foreground">Assigned Courier</Label>
                  <p className="font-medium text-sm">{order.assigned_courier_name}</p>
                </div>
              )}
              {order.status === 'delivered' && (
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowProofModal(true)}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    View Proof of Delivery
                  </Button>
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <Label className="text-muted-foreground">Customer Confirmation</Label>
                  {order.confirmed_by_customer_at ? (
                    <div className="mt-1">
                      <Badge variant="default">
                        ✓ {order.auto_confirmed ? 'Auto-confirmed' : 'Confirmed'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(order.confirmed_by_customer_at)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <Badge variant="secondary">
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
                  <div className="shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
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
                      Since {formatDate(order.status_history && order.status_history.length > 0 
                        ? order.status_history.reduce((latest, current) => 
                            new Date(latest.changed_at) > new Date(current.changed_at) ? latest : current
                          ).changed_at 
                        : order.created_at)}
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
                        <div 
                          key={status} 
                          onClick={() => setNewStatus(status)}
                          className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-500/20 border-blue-500 shadow-md' 
                              : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                          }`}
                        >
                          <RadioGroupItem value={status} id={status} className="mt-0.5" />
                          <div className="flex-1 pointer-events-none">
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
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {!newStatus && (
                    <p className="text-[10px] font-medium text-destructive mt-2 animate-pulse flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Please select a new status from the list above
                    </p>
                  )}
                  {newStatus === 'shipped' && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="courier">Courier Service</Label>
                        <Input
                          id="courier"
                          value="NSD Delivery"
                          readOnly
                          className="bg-muted/50 cursor-not-allowed font-medium"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="tracking">Tracking Number *</Label>
                        <Input
                          id="tracking"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Auto-generated tracking number"
                          minLength={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-generated. You can edit if needed.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="manual-courier" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Assign Specific Courier (Optional)
                        </Label>
                        <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                          <SelectTrigger id="manual-courier">
                            <SelectValue placeholder="Automatic Assignment (Least Loaded)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Automatic Assignment (Default)</SelectItem>
                            {availableCouriers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          If unselected, the system will auto-assign based on courier workload.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Label htmlFor="status-notes">Status Update Notes (Optional)</Label>
                  <Textarea
                    id="status-notes"
                    className="mt-1"
                    placeholder="Add any internal remarks about this status change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setNewStatus('');
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
                    onClick={() => {
                      if (!newStatus) {
                        toast({ title: 'Selection Required', description: 'Please choose a new status from the list above.', variant: 'destructive' });
                        return;
                      }
                      setShowConfirmDialog(true);
                    }}
                    disabled={isUpdating || !newStatus || newStatus === order.status}
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

          {/* Failed delivery advisory note */}
          {courierDeliveryFailed && (
            <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="pt-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                  Delivery attempt failed. Please reassign the courier when the route is next available.
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
              {newStatus === 'delivered' && order.payment_method === 'cod' && order.payment_status === 'pending' && (
                <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-400 font-medium">
                    ⚠️ Warning: COD Payment is still pending. Ensure cash is collected upon delivery.
                  </p>
                </div>
              )}
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
                <Button onClick={() => handleStatusUpdate(false)} disabled={isUpdating} className="flex-1">
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

      {/* Override Warning Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-card border-2 border-destructive/50 shadow-2xl shadow-destructive/20 animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive font-bold text-lg">⚠️ No Proof of Delivery Yet</CardTitle>
                <CardDescription className="font-medium text-destructive/80 mt-1">Manual Override Required</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="pl-14 space-y-6">
                <p className="text-sm">
                  The assigned courier has not uploaded proof of delivery for this order. Are you sure you want to manually confirm delivery? This action will be securely logged as an admin override.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowOverrideDialog(false)}
                    disabled={isUpdating}
                    className="flex-1 font-medium bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleStatusUpdate(true)} 
                    disabled={isUpdating} 
                    variant="destructive"
                    className="flex-1 font-bold shadow-sm flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Overriding...
                      </>
                    ) : (
                      'Confirm Override'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Proof of Delivery Modal */}
      <ProofOfDeliveryModal
        isOpen={showProofModal}
        onOpenChange={setShowProofModal}
        orderId={order.id}
      />
    </div>
  );
}

function OrderDetailsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-10 h-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 md:w-96" />
          <Skeleton className="h-4 w-40 md:w-60" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 max-w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-5 w-20 ml-auto" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t flex justify-between items-center">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>

          {/* Order Timeline Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-60 max-w-full mt-1" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pb-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          {/* Order Summary Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status Update Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full mt-1" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-1 gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
