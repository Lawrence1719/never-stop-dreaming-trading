"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { ChevronDown } from "lucide-react";

interface VariantSelectorProps {
  variants: ProductVariant[];
  onVariantChange: (variant: ProductVariant) => void;
  selectedVariant?: ProductVariant;
  label?: string;
}

export function VariantSelector({
  variants,
  onVariantChange,
  selectedVariant,
  label = "Choose Size/Weight",
}: VariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!variants || variants.length === 0) {
    return null;
  }

  // If only one variant, don't show selector
  if (variants.length === 1) {
    const variant = variants[0];
    if (!selectedVariant) {
      onVariantChange(variant);
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{variant.variant_label}</span>
        <Badge variant="secondary">{formatPrice(Number(variant.price))}</Badge>
      </div>
    );
  }

  const current = selectedVariant;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Button
          variant="outline"
          className={`w-full justify-between ${!current ? "border-dashed border-primary/40 bg-primary/5" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {current ? (
            <div className="flex items-center gap-2">
              <span>{current.variant_label}</span>
              <Badge variant="secondary">{formatPrice(Number(current.price))}</Badge>
            </div>
          ) : (
            <span className="text-muted-foreground italic">-- Select an option --</span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-input rounded-lg shadow-lg z-50">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  onVariantChange(variant);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0 ${
                  variant.id === current?.id ? "bg-muted font-medium" : ""
                } ${variant.stock === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                disabled={variant.stock === 0}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{variant.variant_label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatPrice(Number(variant.price))}</Badge>
                    {variant.stock === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : (
                      <Badge variant="outline">{variant.stock} in stock</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
