"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, CreditCard, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  default: boolean;
  email?: string; // for PayPal
}

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm-1',
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2025,
    default: true,
  },
  {
    id: 'pm-2',
    type: 'card',
    last4: '8888',
    brand: 'Mastercard',
    expiryMonth: 6,
    expiryYear: 2026,
    default: false,
  },
];

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);

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

  const handleDelete = (methodId: string) => {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== methodId));
    addToast("Payment method deleted", "success");
  };

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods((prev) =>
      prev.map((pm) => ({ ...pm, default: pm.id === methodId }))
    );
    addToast("Default payment method updated", "success");
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return `${method.brand} •••• ${method.last4}`;
    } else if (method.type === 'paypal') {
      return `PayPal (${method.email})`;
    } else {
      return 'Bank Account';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Payment Method
            </Button>
          </div>

          <h1 className="text-3xl font-bold mb-8">Payment Methods</h1>

          {paymentMethods.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No payment methods</h3>
              <p className="text-muted-foreground mb-6">
                Add a payment method to make checkout faster and easier.
              </p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{getPaymentMethodDisplay(method)}</h3>
                          {method.default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {method.type === 'card' && method.expiryMonth && method.expiryYear && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDelete(method.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {!method.default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Security</h3>
            <p className="text-sm text-muted-foreground">
              Your payment information is encrypted and securely stored. We never share your payment details with third parties.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

