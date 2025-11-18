"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WishlistContextType {
  wishlist: string[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("wishlist");
    if (saved) {
      setWishlist(JSON.parse(saved));
    }
  }, []);

  const addItem = (productId: string) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) return prev;
      const updated = [...prev, productId];
      localStorage.setItem("wishlist", JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (productId: string) => {
    setWishlist((prev) => {
      const updated = prev.filter((id) => id !== productId);
      localStorage.setItem("wishlist", JSON.stringify(updated));
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
