"use client";

import Link from "next/link";
import { Trash2 } from 'lucide-react';
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { useCart } from "@/lib/context/cart-context";
import { QuantitySelector } from "./quantity-selector";
import { useToast } from "@/hooks/use-toast";
import { ProductImage } from "@/components/shared/ProductImage";

interface CartItemProps {
  product: Product;
  quantity: number;
}

export function CartItem({ product, quantity }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { toast } = useToast();

  return (
    <div className="flex gap-3 sm:gap-4 pb-4 border-b border-border">
      <Link href={`/products/${product.id}`} className="shrink-0 rounded-lg overflow-hidden border border-border/50">
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover"
        />
      </Link>

      <div className="flex-1 flex flex-col gap-1 sm:gap-2 min-w-0">
        {/* Top: Name, Category, Price */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <Link href={`/products/${product.id}`} className="font-semibold hover:text-primary transition-colors text-sm sm:text-base line-clamp-2">
              {product.name}
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{product.category}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-sm sm:text-base">{formatPrice((product.price ?? 0) * quantity)}</p>
            {quantity > 1 && (
               <p className="text-xs text-muted-foreground">{formatPrice(product.price ?? 0)} each</p>
            )}
          </div>
        </div>

        {/* Bottom: Quantity and Trash */}
        <div className="flex items-end justify-between mt-auto pt-2 gap-2">
          <div className="scale-90 origin-left sm:scale-100 min-w-0">
            <QuantitySelector
              quantity={quantity}
              onQuantityChange={(q) => updateQuantity(product.id, q)}
              max={product.stock}
            />
          </div>
          <button
            onClick={() => {
              removeItem(product.id);
              toast({ title: "Removed from cart", variant: "info" });
            }}
            className="text-destructive hover:text-destructive/80 transition-colors p-2 shrink-0 self-center"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
