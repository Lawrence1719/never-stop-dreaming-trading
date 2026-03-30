"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { ChevronLeft, Download, CheckCircle, Clock, Star, AlertCircle, Phone, Truck, Image as ImageIcon } from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RatingModal } from "@/components/orders/RatingModal";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const { orderId } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [daysUntilAutoConfirm, setDaysUntilAutoConfirm] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleRatingSuccess = (rating: number, reviewText: string) => {
    setOrder(prev => prev ? { ...prev, hasRated: true, rating, reviewText, ratedAt: new Date().toISOString() } : null);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !orderId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get session token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('Please log in to view order details');
          setIsLoading(false);
          return;
        }

        // Fetch order using API endpoint
        const response = await fetch('/api/orders', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch order');
        }

        const { data: orders } = await response.json();
        const foundOrder = orders?.find((o: Order) => o.id === orderId);
        
        if (!foundOrder) {
          setError('Order not found');
        } else {
          setOrder(foundOrder);
        }
      } catch (err) {
        console.error('Failed to fetch order', err);
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [user, orderId]);

  // Calculate days until auto-confirm
  useEffect(() => {
    if (!order || order.status !== 'delivered' || !order.deliveredAt || order.confirmedByCustomerAt) {
      setDaysUntilAutoConfirm(null);
      return;
    }

    const calculateDays = () => {
      const deliveredDate = new Date(order.deliveredAt!);
      const autoConfirmDate = new Date(deliveredDate);
      autoConfirmDate.setDate(autoConfirmDate.getDate() + 7);
      
      const now = new Date();
      const diffTime = autoConfirmDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysUntilAutoConfirm(Math.max(0, diffDays));
    };

    calculateDays();
    const interval = setInterval(calculateDays, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, [order]);

  const handleConfirmReceipt = async () => {
    /* ... existing confirmation logic ... */
  };

  const handleCancelOrder = async () => {
    if (!order || isCancelling) return;

    setIsCancelling(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: 'Error', description: 'Please log in to cancel order', variant: 'destructive' });
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      toast({ 
        title: 'Order Cancelled', 
        description: 'Your order has been successfully cancelled and stock has been restored.',
        variant: 'success'
      });
      
      // Redirect to orders page
      router.push('/orders');
    } catch (err) {
      console.error('Failed to cancel order', err);
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to cancel order',
        variant: 'destructive'
      });
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">{error || 'Order not found'}</h1>
            <Link href="/orders" className="text-primary hover:underline">
              Back to orders
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* Header */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
                <p className="text-muted-foreground">{formatDate(order.date)}</p>
              </div>
              <div className={`px-4 py-2 rounded-full font-medium ${statusColors[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </div>
            </div>
          </div>

          {/* Customer Confirmation Section */}
          {order.status === 'delivered' && !order.confirmedByCustomerAt && !order.autoConfirmed && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
                    Your order has been delivered!
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                    Please confirm that you received your order. If you don't confirm within 7 days, it will be automatically confirmed.
                  </p>
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={isConfirming}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isConfirming ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirm Receipt
                      </>
                    )}
                  </button>
                  {daysUntilAutoConfirm !== null && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-3">
                      Auto-confirm in: {daysUntilAutoConfirm} {daysUntilAutoConfirm === 1 ? 'day' : 'days'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Status - After Confirmed */}
          {(order.status === 'completed' || order.confirmedByCustomerAt || order.autoConfirmed) && (
            <div className={`border rounded-lg p-6 mb-8 ${order.hasRated ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${order.hasRated ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'}`}>
                  {order.hasRated ? <CheckCircle className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  {order.hasRated ? (
                    <>
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                        Thanks for your feedback!
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(star => (
                           <Star key={star} className={`w-4 h-4 ${star <= (order.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-emerald-200 dark:text-emerald-800 hidden"}`} />
                        ))}
                      </div>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                        {order.autoConfirmed 
                          ? `Auto-confirmed on ${formatDate(order.confirmedByCustomerAt || order.date)}`
                          : `You confirmed receipt on ${formatDate(order.confirmedByCustomerAt || order.date)}`
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                        You received this order! How was it?
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-4 sm:mb-0">
                        {order.autoConfirmed 
                          ? `Order was auto-confirmed on ${formatDate(order.confirmedByCustomerAt || order.date)}.`
                          : `You confirmed receipt on ${formatDate(order.confirmedByCustomerAt || order.date)}.`
                        } Share your experience to help others!
                      </p>
                    </>
                  )}
                </div>
                {!order.hasRated && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Star className="w-5 h-5 fill-current" />
                    Rate This Order
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6 mb-8">
                <h2 className="font-bold text-lg mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex gap-4 pb-4 border-b border-border last:pb-0 last:border-0">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-bold text-lg mb-4">Shipping Address</h2>
                <p className="font-medium mb-2">{order.shippingAddress.fullName}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {order.shippingAddress.street}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                </p>
                <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
              </div>

              {/* Your Courier Section */}
              {['shipped', 'delivered', 'completed'].includes(order.status) && order.courierName && (
                <div className="bg-card border border-border rounded-lg p-6 mt-8">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Your Courier
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courier Name</p>
                      <p className="font-medium">{order.courierName}</p>
                    </div>
                    {order.courierPhone && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Number</p>
                        <p className="font-medium flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          {order.courierPhone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proof of Delivery Section */}
              {['delivered', 'completed'].includes(order.status) && order.proofImageUrl && (
                <div className="bg-card border border-border rounded-lg p-6 mt-8 shadow-sm">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-700 dark:text-green-400">
                    <ImageIcon className="w-5 h-5" />
                    Delivery Confirmation
                  </h2>
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border group cursor-zoom-in">
                      <img 
                        src={order.proofImageUrl} 
                        alt="Proof of Delivery" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onClick={() => window.open(order.proofImageUrl || '', '_blank')}
                      />
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to enlarge
                      </div>
                    </div>
                    
                    {order.deliveryNotes && (
                      <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Courier Notes</p>
                        <p className="text-sm italic text-foreground">"{order.deliveryNotes}"</p>
                      </div>
                    )}
                    
                    {order.deliveredAt && (
                      <p className="text-xs text-muted-foreground">
                        Delivered on: <span className="font-medium">{formatDate(order.deliveredAt)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-8 space-y-6">
                <div>
                  <h3 className="font-bold mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm border-b border-border pb-3 mb-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatPrice(order.shipping)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">Payment Method</h3>
                  <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                </div>

                {order.trackingNumber && (
                  <div>
                    <h3 className="font-bold mb-2">Tracking Number</h3>
                    <p className="text-sm font-mono bg-secondary/10 p-2 rounded border border-border">
                      {order.trackingNumber}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-border">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
                    <Download className="w-4 h-4" />
                    Invoice
                  </button>
                  <Link
                    href={`/order-tracking/${order.id}`}
                    className="flex-1 text-center px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Track Order
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Section */}
          {['pending', 'processing'].includes(order.status) && (
            <div className="mt-12 pt-8 border-t border-border flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-4">Changed your mind?</p>
              <button
                onClick={() => setShowCancelDialog(true)}
                className="px-6 py-2 border-2 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Cancel Order
              </button>
            </div>
          )}
        </div>

        {/* Cancellation Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Cancel Order?</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to cancel your order <span className="font-semibold text-foreground">{order.orderNumber}</span>? This action cannot be undone and your items will be returned to stock.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelDialog(false)}
                    disabled={isCancelling}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted font-medium transition-colors"
                  >
                    No, Keep Order
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCancelling ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Yes, Cancel Order'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRatingModal && (
          <RatingModal
            orderId={order.id}
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            onSuccess={handleRatingSuccess}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
