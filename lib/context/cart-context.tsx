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

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const addItem = (productId: string, quantity: number) => {
    setCart((prev) => {
      const existingItem = prev.items.find((i) => i.productId === productId);
      let newItems: CartItem[];

      if (existingItem) {
        newItems = prev.items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...prev.items, { productId, quantity }];
      }

      const newCart = { items: newItems, total: calculateTotal(newItems) };
      localStorage.setItem("cart", JSON.stringify(newCart));
      return newCart;
    });
  };

  const removeItem = (productId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((i) => i.productId !== productId);
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      localStorage.setItem("cart", JSON.stringify(newCart));
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
      localStorage.setItem("cart", JSON.stringify(newCart));
      return newCart;
    });
  };

  const clearCart = () => {
    const newCart = { items: [], total: 0 };
    setCart(newCart);
    localStorage.removeItem("cart");
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
