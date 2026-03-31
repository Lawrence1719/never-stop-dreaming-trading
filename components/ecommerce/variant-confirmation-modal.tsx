"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/formatting";
import { ShoppingCart, CreditCard, AlertCircle, Package } from 'lucide-react';
import { StockIndicator } from "./stock-indicator";

interface VariantConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: {
    name: string;
    image_url?: string;
    images?: string[];
  };
  variant: {
    variant_label: string;
    price: number;
    stock: number;
  };
  quantity: number;
  actionType: 'add' | 'buy';
}

export function VariantConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  product,
  variant,
  quantity,
  actionType,
}: VariantConfirmationModalProps) {
  const subtotal = Number(variant.price) * quantity;
  const isLowStock = variant.stock > 0 && variant.stock <= 10;
  const productImage = product.images?.[0] || product.image_url || "/placeholder-image.jpg";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {actionType === 'add' ? (
              <>
                <ShoppingCart className="w-5 h-5 text-primary" />
                Confirm Add to Cart
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 text-accent" />
                Confirm Selection
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Please review your selection before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Summary Card */}
          <div className="flex gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-background border flex-shrink-0">
              <img
                src={productImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-bold text-lg truncate leading-tight">{product.name}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-2 py-0 h-5 text-[11px] font-medium">
                  {variant.variant_label}
                </Badge>
                <span className="text-sm text-muted-foreground">× {quantity}</span>
              </div>
              <p className="text-primary font-bold">{formatPrice(Number(variant.price))}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-background border rounded-lg space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Stock Level</p>
              <StockIndicator stock={variant.stock} showDetailed={false} />
            </div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70">Subtotal</p>
              <p className="text-lg font-bold text-primary">{formatPrice(subtotal)}</p>
            </div>
          </div>

          {/* Stock Warning */}
          {isLowStock && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 animate-pulse">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Limited Stock Remaining!</p>
                <p>Only {variant.stock} units left in our warehouse for this variant. Act fast to secure your order.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/30 border-t flex-row sm:justify-between items-center gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            className={`flex-1 sm:flex-none shadow-lg px-8 ${
              actionType === 'add' 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            }`}
          >
            {actionType === 'add' ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </>
            ) : (
              <>
                💳 Confirm Buy Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
