"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSettings } from "@/lib/hooks/use-settings";

export type ShippingMethod = "standard" | "express";

interface ShippingContextType {
  shippingMethod: ShippingMethod;
  setShippingMethod: (method: ShippingMethod) => void;
  calculateShipping: (subtotal: number) => number;
  shippingRates: {
    standard: number;
    express: number;
    freeThreshold: number;
  };
  isFreeShipping: (subtotal: number) => boolean;
}

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export function ShippingProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [shippingMethod, setShippingMethodState] = useState<ShippingMethod>("standard");

  // Load saved shipping method from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("shippingMethod");
    if (saved === "standard" || saved === "express") {
      setShippingMethodState(saved);
    }
  }, []);

  // Save shipping method to localStorage when it changes
  const setShippingMethod = (method: ShippingMethod) => {
    setShippingMethodState(method);
    localStorage.setItem("shippingMethod", method);
  };

  // Get current shipping rates from settings (in PHP)
  const shippingRates = {
    standard: parseFloat(settings?.shipping?.standardRate || "299.00"),
    express: parseFloat(settings?.shipping?.expressRate || "599.00"),
    freeThreshold: parseFloat(settings?.shipping?.freeShippingThreshold || "2500.00"),
  };

  // Check if subtotal qualifies for free shipping
  const isFreeShipping = (subtotal: number): boolean => {
    return subtotal >= shippingRates.freeThreshold;
  };

  // Calculate shipping cost based on subtotal and selected method
  const calculateShipping = (subtotal: number): number => {
    // Free shipping if subtotal exceeds threshold
    if (isFreeShipping(subtotal)) {
      return 0;
    }

    // Return rate based on selected method
    if (shippingMethod === "express") {
      return shippingRates.express;
    }
    
    return shippingRates.standard;
  };

  return (
    <ShippingContext.Provider
      value={{
        shippingMethod,
        setShippingMethod,
        calculateShipping,
        shippingRates,
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
