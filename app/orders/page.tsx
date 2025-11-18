"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { mockOrders } from "@/lib/mock/orders";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { ChevronRight, Eye } from 'lucide-react';

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function OrdersPage() {
  const { user } = useAuth();

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

          {mockOrders.length === 0 ? (
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
              {mockOrders.map((order) => (
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

                  <div className="flex gap-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                    <Link
                      href={`/order-tracking/${order.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      Track
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
