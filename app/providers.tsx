"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/context/auth-context";
import { CartProvider } from "@/lib/context/cart-context";
import { WishlistProvider } from "@/lib/context/wishlist-context";
import { ThemeProvider } from "@/lib/context/theme-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
