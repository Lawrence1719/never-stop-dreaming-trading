"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { ChevronLeft, Download } from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const { orderId } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
