"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Cart, CartItem } from "@/lib/types";
import { products } from "@/lib/mock/products";

interface CartContextType {
  cart: Cart;
  addItem: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });

  // Session-based guest cart: do NOT use localStorage, just keep in memory for session
  // If you want to persist across tabs or refresh, use localStorage (disabled for this prompt)
  // On refresh, cart will reset

  // CartItem now stores productId, name, price, quantity, image
  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  const addItem = (productId: string, quantity: number) => {
    // Find product details (from mockProducts or DB)
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => {
      const existingItem = prev.items.find((i) => i.productId === productId);
      let newItems: CartItem[];
      if (existingItem) {
        newItems = prev.items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...prev.items, {
          productId,
          name: product.name,
          price: product.price,
          quantity,
          image: product.images[0] || '',
        }];
      }
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      return newCart;
    });
  };

  const removeItem = (productId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((i) => i.productId !== productId);
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      return newCart;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCart((prev) => {
      const newItems = prev.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      return newCart;
    });
  };

  const clearCart = () => {
    const newCart = { items: [], total: 0 };
    setCart(newCart);
  };

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
