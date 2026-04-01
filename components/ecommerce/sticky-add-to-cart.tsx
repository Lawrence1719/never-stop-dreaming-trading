"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Minus, Plus, AlertCircle } from 'lucide-react';
import { QuantitySelector } from "./quantity-selector";
import { StockIndicator } from "./stock-indicator";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/formatting";

interface StickyAddToCartProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number | null;
    reorder_threshold?: number;
  };
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  isVisible: boolean;
  priceDisplay?: string;
}

export function StickyAddToCart({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  isVisible,
  priceDisplay,
}: StickyAddToCartProps) {
  if (!isVisible) return null;

  const max = product.stock;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl md:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-primary">{priceDisplay || formatPrice(product.price)}</span>
              {max === null ? null : max > 0 ? (
                <StockIndicator 
                  stock={max} 
                  reorderThreshold={product.reorder_threshold}
                  showDetailed={false}
                />
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1 text-[10px] py-0 px-1.5 h-5">
                  <AlertCircle className="w-3 h-3" />
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Quantity & Add Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {max !== null && max > 0 && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                  <button
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    className="p-1 px-2 hover:bg-secondary/20 active:scale-95 transition-all rounded-md flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
                    className="p-1 px-2 hover:bg-secondary/20 active:scale-95 transition-all rounded-md flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={quantity >= max}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={onAddToCart}
              disabled={max === null || max === 0}
              className={`px-6 py-3 rounded-lg transition-all font-semibold flex items-center gap-2 shadow-lg justify-center ${
                max === null
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : max === 0 
                  ? "bg-muted text-muted-foreground border border-border cursor-not-allowed" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
              }`}
            >
              {max === null ? (
                <span className="text-sm whitespace-nowrap">Select option</span>
              ) : max > 0 ? (
                <>
                  <ShoppingCart className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">Add to Cart</span>
                </>
              ) : (
                <span className="whitespace-nowrap">Out of Stock</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}













