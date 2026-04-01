"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckCircle } from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/formatting";
import { Order } from "@/lib/types";

export default function OrderConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState<string>("Standard Shipping (5-7 business days)");

  // Fetch order details
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
          setError('Please log in to view order confirmation');
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
          // Set shipping method from order data
          setShippingMethod(foundOrder.shippingMethod || 'Standard Shipping (5-7 business days)');
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

  // Calculate estimated delivery (5-7 business days from order date)
  const getEstimatedDelivery = () => {
    if (!order) return new Date();
    const orderDate = new Date(order.date);
    // Add 6 days (average of 5-7 business days)
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 6);
    return deliveryDate;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-muted-foreground">Loading order confirmation...</p>
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
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">{error || 'Order not found'}</h1>
            <Link
              href="/orders"
              className="text-primary hover:underline"
            >
              View Your Orders
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
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase. Your order has been placed successfully.
          </p>

          <div className="bg-card border border-border rounded-lg p-8 mb-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-2xl font-bold text-primary">{order.orderNumber}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{formatDate(order.date)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                <p className="font-medium">
                  {formatDate(getEstimatedDelivery())}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Shipping Method</p>
                <p className="font-medium">{shippingMethod}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-lg text-primary">{formatPrice(order.total)}</p>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mb-8">
            A confirmation email has been sent to your registered email address.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/orders/${order.id}`}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              View Order Details
            </Link>
            <Link
              href="/products"
              className="px-8 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-semibold"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
