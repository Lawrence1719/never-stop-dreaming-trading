"use client";

import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  max?: number;
}

export function QuantitySelector({ quantity, onQuantityChange, max }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-2 border border-border rounded-lg p-1">
      <button
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        className="p-1 hover:bg-secondary/10 transition-colors"
        disabled={quantity <= 1}
      >
        <Minus className="w-4 h-4" />
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
        className="w-12 text-center bg-transparent outline-none"
      />
      <button
        onClick={() => onQuantityChange(Math.min(max || quantity + 1, quantity + 1))}
        className="p-1 hover:bg-secondary/10 transition-colors"
        disabled={max ? quantity >= max : false}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
