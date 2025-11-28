"use client";

import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  max?: number;
}

export function QuantitySelector({ quantity, onQuantityChange, max }: QuantitySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Quantity</label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-card">
          <button
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="p-2 hover:bg-secondary/20 active:scale-95 transition-all rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            min="1"
            max={max}
            value={quantity}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 1 && (!max || val <= max)) {
                onQuantityChange(val);
              }
            }}
            className="w-16 text-center bg-transparent outline-none text-lg font-semibold"
          />
          <button
            onClick={() => onQuantityChange(Math.min(max || quantity + 1, quantity + 1))}
            className="p-2 hover:bg-secondary/20 active:scale-95 transition-all rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
            disabled={max ? quantity >= max : false}
            aria-label="Increase quantity"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {max && (
          <span className="text-sm text-muted-foreground">Max: {max} per order</span>
        )}
      </div>
    </div>
  );
}
