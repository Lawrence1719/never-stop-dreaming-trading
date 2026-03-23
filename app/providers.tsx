"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/context/auth-context";
import { CartProvider } from "@/lib/context/cart-context";
import { WishlistProvider } from "@/lib/context/wishlist-context";
import { ShippingProvider } from "@/lib/context/shipping-context";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <CartProvider>
          <ShippingProvider>
            <WishlistProvider>
              {children}
              <Toaster />
            </WishlistProvider>
          </ShippingProvider>
        </CartProvider>
      </AuthProvider>
    </NextThemesProvider>
  );
}
