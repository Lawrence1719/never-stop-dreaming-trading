"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, Plus, MapPin, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AddressesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();

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

  const addresses = user.addresses || [];

  const handleDelete = (addressId: string) => {
    // In a real app, delete address from backend
    addToast("Address deleted", "success");
  };

  const handleSetDefault = (addressId: string) => {
    // In a real app, set default address in backend
    addToast("Default address updated", "success");
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
              Add New Address
            </Button>
          </div>

          <h1 className="text-3xl font-bold mb-8">Address Book</h1>

          {addresses.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No saved addresses</h3>
              <p className="text-muted-foreground mb-6">
                Add an address to make checkout faster and easier.
              </p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Address
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">{address.label}</h3>
                      {address.default && (
                        <Badge variant="default" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDelete(address.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{address.fullName}</p>
                    <p>{address.street}</p>
                    <p>
                      {address.city}, {address.province} {address.zip}
                    </p>
                    <p>{address.phone}</p>
                  </div>
                  {!address.default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      Set as Default
                    </Button>
                  )}
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

