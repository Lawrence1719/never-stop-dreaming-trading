"use client";

import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { mockTracking } from "@/lib/mock/orders";
import { formatDate } from "@/lib/utils/formatting";
import { ChevronLeft, MapPin, Truck } from 'lucide-react';

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const tracking = mockTracking.find((t) => t.orderId === params.orderId);

  if (!tracking) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Tracking information not found</h1>
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
                  {tracking.updates.map((update, i) => (
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
                      { label: "Order Placed", done: true },
                      { label: "Processing", done: true },
                      { label: "Shipped", done: true },
                      { label: "Out for Delivery", done: tracking.status === "delivered" },
                      { label: "Delivered", done: tracking.status === "delivered" },
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
                  href="/orders"
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
