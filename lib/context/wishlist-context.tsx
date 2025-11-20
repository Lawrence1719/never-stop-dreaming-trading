"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/context/auth-context";

interface WishlistContextType {
  wishlist: string[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const { user } = useAuth();

  // Only persist wishlist for logged-in users (localStorage for demo, but could be DB)
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`wishlist_${user.id}`);
      if (saved) {
        setWishlist(JSON.parse(saved));
      } else {
        setWishlist([]);
      }
    } else {
      setWishlist([]);
    }
  }, [user]);

  const addItem = (productId: string) => {
    if (!user) return; // Only allow wishlist for logged-in users
    setWishlist((prev) => {
      if (prev.includes(productId)) return prev;
      const updated = [...prev, productId];
      localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (productId: string) => {
    if (!user) return;
    setWishlist((prev) => {
      const updated = prev.filter((id) => id !== productId);
      localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <WishlistContext.Provider value={{ wishlist, addItem, removeItem, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}
