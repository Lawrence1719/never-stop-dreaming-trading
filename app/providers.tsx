"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/context/auth-context";
import { CartProvider } from "@/lib/context/cart-context";
import { WishlistProvider } from "@/lib/context/wishlist-context";
import { ShippingProvider } from "@/lib/context/shipping-context";
import { SearchProvider } from "@/lib/context/search-context";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { MaintenanceGuard } from "@/components/layout/MaintenanceGuard";
import AccountDeletionOverlay from "@/components/auth/AccountDeletionOverlay";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <ShippingProvider>
              <WishlistProvider>
                <MaintenanceGuard>
                  {children}
                </MaintenanceGuard>
                <AccountDeletionOverlay />
                <Toaster />
                <SonnerToaster position="top-right" closeButton richColors />
              </WishlistProvider>
            </ShippingProvider>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </NextThemesProvider>
  );
}
