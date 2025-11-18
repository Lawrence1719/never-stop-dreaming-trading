"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckCircle } from 'lucide-react';

export default function OrderConfirmationPage({ params }: { params: { orderId: string } }) {
  const [confirmationNumber] = useState("ORD-2025-" + Math.random().toString(36).substr(2, 5).toUpperCase());

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
                <p className="text-2xl font-bold text-primary">{confirmationNumber}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                <p className="font-medium">
                  {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Shipping Method</p>
                <p className="font-medium">Standard Shipping (5-7 business days)</p>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mb-8">
            A confirmation email has been sent to your registered email address.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/orders"
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
