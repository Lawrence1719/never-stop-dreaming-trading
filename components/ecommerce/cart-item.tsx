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
    <div className="flex gap-4 pb-4 border-b border-border">
      <Link href={`/products/${product.id}`} className="shrink-0 rounded-lg overflow-hidden border border-border/50">
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-24 h-24"
        />
      </Link>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/products/${product.id}`} className="font-semibold hover:text-primary transition-colors">
            {product.name}
          </Link>
          <p className="text-sm text-muted-foreground">{product.category}</p>
        </div>

        <div className="flex items-center justify-between">
          <QuantitySelector
            quantity={quantity}
            onQuantityChange={(q) => updateQuantity(product.id, q)}
            max={product.stock}
          />
          <button
            onClick={() => {
              removeItem(product.id);
              toast({ title: "Removed from cart", variant: "info" });
            }}
            className="text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="text-right">
        <p className="font-semibold">{formatPrice((product.price ?? 0) * quantity)}</p>
        <p className="text-sm text-muted-foreground">{formatPrice(product.price ?? 0)} each</p>
      </div>
    </div>
  );
}
