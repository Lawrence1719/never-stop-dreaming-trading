"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Wallet, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/profile"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Profile
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-8">Payment Methods</h1>

          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Cash on Delivery (COD)</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Currently, we only accept Cash on Delivery. Pay with cash when your order is delivered to your doorstep.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>Pay when you receive your order</span>
            </div>
          </div>

          <div className="mt-8 bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              We're working on adding more payment options including credit/debit cards, e-wallets, and bank transfers. Stay tuned!
            </p>
          </div>

          <div className="mt-6 bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Why Cash on Delivery?</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>No need to share payment details online</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Inspect your order before paying</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Safe and convenient for everyone</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

