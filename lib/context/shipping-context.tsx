"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSettings } from "@/lib/hooks/use-settings";

export type ShippingMethod = "standard" | "express";

interface ShippingContextType {
  shippingMethod: string;
  setShippingMethod: (method: string) => void;
  calculateShipping: (subtotal: number) => number;
  isFreeShipping: (subtotal: number) => boolean;
}

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export function ShippingProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  
  // Method is now fixed for NSD operations
  const shippingMethod = "NSD Delivery";
  const setShippingMethod = () => {};

  // Check if all orders are free based on settings
  const isFreeShipping = (): boolean => {
    return settings?.shipping?.freeShippingEnabled ?? true;
  };

  // Calculate shipping cost
  const calculateShipping = (): number => {
    // For now, even if not free, cost is 0 until fees are defined
    if (isFreeShipping()) {
      return 0;
    }
    
    return 0; // placeholder until fees are defined
  };

  return (
    <ShippingContext.Provider
      value={{
        shippingMethod,
        setShippingMethod,
        calculateShipping,
        isFreeShipping,
      }}
    >
      {children}
    </ShippingContext.Provider>
  );
}

export function useShipping() {
  const context = useContext(ShippingContext);
  if (!context) {
    throw new Error("useShipping must be used within a ShippingProvider");
  }
  return context;
}
