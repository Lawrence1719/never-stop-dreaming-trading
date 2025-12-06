"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { ChevronLeft, Download, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    if (!order || isConfirming) return;

    setIsConfirming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: 'Error', description: 'Please log in to confirm receipt', variant: 'destructive' });
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm receipt');
      }

      toast({ title: 'Success!', description: 'Thank you for confirming receipt!' });
      
      // Reload the page to show updated status
      window.location.reload();
    } catch (err) {
      console.error('Failed to confirm receipt', err);
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to confirm receipt',
        variant: 'destructive'
      });
    } finally {
      setIsConfirming(false);
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
          {order.status === 'delivered' && !order.confirmedByCustomerAt && order.deliveredAt && (
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
          {order.confirmedByCustomerAt && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                    {order.autoConfirmed ? 'Order Completed' : 'Receipt Confirmed'}
                  </h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    {order.autoConfirmed 
                      ? `Auto-confirmed on ${formatDate(order.confirmedByCustomerAt)}`
                      : `You confirmed receipt on ${formatDate(order.confirmedByCustomerAt)}`
                    }
                  </p>
                </div>
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
