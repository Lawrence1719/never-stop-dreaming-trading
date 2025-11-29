"use client";

import { useState, useEffect } from "react";
import { ShoppingCart } from 'lucide-react';
import { QuantitySelector } from "./quantity-selector";
import { StockIndicator } from "./stock-indicator";
import { formatPrice } from "@/lib/utils/formatting";

interface StickyAddToCartProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    reorder_threshold?: number;
  };
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  isVisible: boolean;
}

export function StickyAddToCart({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  isVisible,
}: StickyAddToCartProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl md:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
              <StockIndicator 
                stock={product.stock} 
                reorderThreshold={product.reorder_threshold}
                showDetailed={false}
              />
            </div>
          </div>

          {/* Quantity & Add Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="p-1.5 hover:bg-secondary/20 rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                disabled={quantity <= 1}
              >
                <span className="text-lg">−</span>
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => onQuantityChange(Math.min(product.stock || 999, quantity + 1))}
                className="p-1.5 hover:bg-secondary/20 rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                disabled={product.stock > 0 && quantity >= product.stock}
              >
                <span className="text-lg">+</span>
              </button>
            </div>
            <button
              onClick={onAddToCart}
              disabled={product.stock === 0}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


