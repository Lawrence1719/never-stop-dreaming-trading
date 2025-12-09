"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TrackingData, TrackingUpdate } from "@/lib/types";
import { formatDate } from "@/lib/utils/formatting";
import { MapPin, Truck } from 'lucide-react';
import { supabase } from "@/lib/supabase/client";
import { BackButton } from "./back-button";
import { useAuth } from "@/lib/context/auth-context";

async function fetchOrderTracking(orderId: string, userId: string): Promise<TrackingData | null> {
  try {
    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session found for tracking page');
      return null;
    }

    console.log('Fetching order tracking for orderId:', orderId, 'userId:', userId);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, tracking_number, courier, shipped_at, delivered_at, created_at, user_id')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
      return null;
    }

    if (!order) {
      console.error('No order found with id:', orderId);
      return null;
    }

    console.log('Order found:', { id: order.id, status: order.status, tracking_number: order.tracking_number });

    // Verify user owns this order (security check)
    if (order.user_id !== userId) {
      console.error('User does not own this order. Order user_id:', order.user_id, 'Session user.id:', userId);
      return null;
    }

    // Fetch status history for tracking timeline
    const { data: statusHistory, error: historyError } = await supabase
      .from('order_status_history')
      .select('old_status, new_status, changed_at, notes, tracking_number, courier')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false });

    if (historyError) {
      console.error('Status history fetch error:', historyError);
    }

    // Build tracking updates from status history
    const updates: TrackingUpdate[] = [];
    
    if (statusHistory && statusHistory.length > 0) {
      statusHistory.forEach((history) => {
        const statusLabel = history.new_status.charAt(0).toUpperCase() + history.new_status.slice(1);
        updates.push({
          status: statusLabel,
          location: history.notes || getDefaultLocationForStatus(history.new_status, order.courier),
          timestamp: history.changed_at,
          description: getDescriptionForStatus(history.new_status, order.courier, order.tracking_number),
        });
      });
    } else {
      // If no status history, create a default update based on current order status
      updates.push({
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        location: getDefaultLocationForStatus(order.status, order.courier),
        timestamp: order.created_at,
        description: getDescriptionForStatus(order.status, order.courier, order.tracking_number),
      });
    }

    // Calculate estimated delivery (3-5 business days from ship date)
    let estimatedDelivery = new Date();
    if (order.shipped_at) {
      estimatedDelivery = new Date(order.shipped_at);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);
    } else {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
    }

    // Determine current location
    const currentLocation = updates[0]?.location || getDefaultLocationForStatus(order.status, order.courier);

    const trackingData: TrackingData = {
      orderId: order.id,
      status: order.status,
      location: currentLocation,
      estimatedDelivery: estimatedDelivery.toISOString(),
      updates: updates,
    };

    return trackingData;
  } catch (error) {
    console.error('Unexpected error fetching tracking data:', error);
    return null;
  }
}

function getDefaultLocationForStatus(status: string, courier?: string | null): string {
  const courierName = courier || 'Local Courier';
  
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Order Processing Center';
    case 'paid':
      return 'Payment Confirmed';
    case 'processing':
      return 'Warehouse - Preparing Shipment';
    case 'shipped':
      return `${courierName} Facility`;
    case 'delivered':
      return 'Delivered to Customer';
    case 'completed':
      return 'Order Complete';
    case 'cancelled':
      return 'Order Cancelled';
    default:
      return 'Processing Center';
  }
}

function getDescriptionForStatus(status: string, courier?: string | null, trackingNumber?: string | null): string {
  const courierName = courier || 'courier';
  const trackingInfo = trackingNumber ? ` Tracking number: ${trackingNumber}` : '';
  
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Your order has been received and is awaiting payment confirmation.';
    case 'paid':
      return 'Payment confirmed. Your order will be processed shortly.';
    case 'processing':
      return 'Your order is being prepared for shipment. Items are being picked and packed.';
    case 'shipped':
      return `Your order has been shipped via ${courierName}.${trackingInfo}`;
    case 'delivered':
      return 'Your order has been successfully delivered. Thank you for your purchase!';
    case 'completed':
      return 'Order completed and confirmed by customer.';
    case 'cancelled':
      return 'This order has been cancelled.';
    default:
      return 'Order is being processed.';
  }
}

export default function OrderTrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { user } = useAuth();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTracking() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchOrderTracking(orderId, user.id);
        setTracking(data);
      } catch (err) {
        console.error('Error loading tracking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tracking data');
      } finally {
        setIsLoading(false);
      }
    }

    loadTracking();
  }, [orderId, user]);

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to view tracking</h1>
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p>Loading tracking information...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle not authenticated or not found
  if (!tracking) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Tracking information not found</h1>
            <p className="text-muted-foreground mb-6">
              This order could not be found or you do not have permission to view it.
            </p>
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
          <BackButton />

          <h1 className="text-3xl font-bold mb-8">Track Your Order</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Tracking */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <p className="text-2xl font-bold capitalize">{tracking.status}</p>
                  </div>
                  <div className="text-4xl">
                    {tracking.status === "delivered" ? "✓" : <Truck className="w-12 h-12 text-primary" />}
                  </div>
                </div>

                <div className="space-y-6">
                  {tracking.updates.map((update: TrackingUpdate, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${i === 0 ? "bg-primary" : "bg-secondary"}`} />
                        {i < tracking.updates.length - 1 && <div className="w-0.5 h-12 bg-border mt-2" />}
                      </div>
                      <div className="pb-6">
                        <p className="font-semibold">{update.status}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(update.timestamp)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {update.location}
                        </p>
                        <p className="text-sm mt-2">{update.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-8 space-y-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">ESTIMATED DELIVERY</p>
                  <p className="text-lg font-bold">{formatDate(tracking.estimatedDelivery)}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CURRENT LOCATION</p>
                  <p className="font-medium">{tracking.location}</p>
                </div>

                <div className="border-t border-border pt-6">
                  <p className="text-xs font-medium text-muted-foreground mb-3">SHIPMENT STATUS</p>
                  <div className="space-y-2">
                    {[
                      { label: "Order Placed", status: "pending", done: true },
                      { label: "Payment Confirmed", status: "paid", done: ["paid", "processing", "shipped", "delivered", "completed"].includes(tracking.status) },
                      { label: "Processing", status: "processing", done: ["processing", "shipped", "delivered", "completed"].includes(tracking.status) },
                      { label: "Shipped", status: "shipped", done: ["shipped", "delivered", "completed"].includes(tracking.status) },
                      { label: "Delivered", status: "delivered", done: ["delivered", "completed"].includes(tracking.status) },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${step.done ? "bg-green-500" : "bg-muted"}`} />
                        <span className={`text-xs ${step.done ? "font-medium" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/orders/${orderId}`}
                  className="w-full block text-center px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
                >
                  View Order Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
