"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Order } from "@/lib/types";
import { ChevronRight, Eye, Star } from 'lucide-react';
import { supabase } from "@/lib/supabase/client";
import { RatingModal } from "@/components/orders/RatingModal";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

  const handleRatingSuccess = (orderId: string, rating: number, reviewText: string) => {
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, hasRated: true, rating, reviewText, ratedAt: new Date().toISOString() } : o
    ));
  };

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get session token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('Please log in to view your orders');
          setIsLoading(false);
          return;
        }

        // Fetch orders using API endpoint
        const response = await fetch('/api/orders', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch orders');
        }

        const { data } = await response.json();
        setOrders(data || []);
      } catch (err) {
        console.error('Failed to fetch orders', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to view your orders</h1>
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Sign In
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">My Orders</h1>

          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-destructive mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
              <Link
                href="/products"
                className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-lg">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.date)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Items</p>
                      <p className="font-medium">{order.items.length} product(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-primary">{formatPrice(order.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking</p>
                      <p className="font-medium text-sm">{order.trackingNumber || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                    <Link
                      href={`/order-tracking/${order.id}`}
                      className="flex-1 min-w-[120px] flex items-center gap-2 justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      Track
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    {order.status === 'delivered' && (order.confirmedByCustomerAt || order.autoConfirmed) && (
                      order.hasRated ? (
                        <div className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium border border-border">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          Rated
                        </div>
                      ) : (
                        <button
                          onClick={() => setRatingOrder(order)}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 border border-secondary text-secondary-foreground hover:text-primary rounded-lg hover:bg-secondary/20 transition-colors text-sm font-medium"
                        >
                          <Star className="w-4 h-4" />
                          Rate
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {ratingOrder && (
          <RatingModal
            orderId={ratingOrder.id}
            isOpen={!!ratingOrder}
            onClose={() => setRatingOrder(null)}
            onSuccess={(rating, reviewText) => handleRatingSuccess(ratingOrder.id, rating, reviewText)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
