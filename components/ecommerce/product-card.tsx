"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { useCart } from "@/lib/context/cart-context";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toasts, addToast, removeToast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product.id, 1);
    addToast("Added to cart", "success");
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inWishlist) {
      removeFromWishlist(product.id);
      addToast("Removed from wishlist", "info");
    } else {
      addToWishlist(product.id);
      addToast("Added to wishlist", "success");
    }
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group cursor-pointer">
        <div className="relative bg-muted rounded-lg overflow-hidden mb-4">
          <img
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name}
            className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {discount && (
            <Badge variant="accent" className="absolute top-3 right-3">
              -{discount}%
            </Badge>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2 pb-4">
              <button
                onClick={handleAddToCart}
                className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
              <button
                onClick={handleWishlist}
                className={`p-2 rounded-full transition-colors ${
                  inWishlist
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Heart className="w-5 h-5" fill={inWishlist ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium">{product.rating}</span>
            <span className="text-xs text-accent">★</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{product.reviewCount} reviews</p>
      </div>
    </Link>
  );
}
