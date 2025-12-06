"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/context/auth-context";
import { CartProvider } from "@/lib/context/cart-context";
import { WishlistProvider } from "@/lib/context/wishlist-context";
import { ShippingProvider } from "@/lib/context/shipping-context";
import { ThemeProvider } from "@/lib/context/theme-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ShippingProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </ShippingProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
