"use client";

import { Heart } from 'lucide-react';
import Link from "next/link";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const { user } = useAuth();
  const inWishlist = isInWishlist(product.id);

  // Determine if product has multiple variants
  const hasVariants = (product.variants?.length ?? 0) > 1;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to add items to your wishlist." });
      return;
    }
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast({ title: "Removed from wishlist" });
    } else {
      addToWishlist(product.id);
      toast({ title: "Added to wishlist" });
    }
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  // Determine price display based on variants
  const getPriceDisplay = () => {
    if (!hasVariants) {
      return formatPrice(product.price);
    }
    
    // For variant products, show price range or "From" price
    const prices = (product.variants || []).map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      return formatPrice(minPrice);
    }
    
    return `From ${formatPrice(minPrice)}`;
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group cursor-pointer flex flex-col h-full">
        <div className="relative bg-muted rounded-lg overflow-hidden mb-4">
          <img
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name}
            className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {/* IoT status badge for refrigerated / frozen categories */}
          {(() => {
            const IOT_CATEGORIES = new Set([
              'Meat',
              'Frozen goods',
              'Dairy',
              'Ice cream',
              'Cold beverages',
              'Refrigerated & Frozen',
            ]);

              if (IOT_CATEGORIES.has(product.category)) {
                const status = product.iot?.status || 'unknown';
                // Map status to color classes (no visible text label)
                const colorClass =
                  status === 'online' ? 'bg-emerald-500' : status === 'offline' ? 'bg-rose-500' : status === 'error' ? 'bg-amber-500' : 'bg-slate-400';

                return (
                  <div className={`absolute top-3 left-3 w-3 h-3 rounded-full ${colorClass}`} aria-hidden="true" />
                );
              }

            return null;
          })()}
          {discount && (
            <Badge variant="accent" className="absolute top-3 right-3">
              -{discount}%
            </Badge>
          )}

          {/* Wishlist button - top right */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 ${discount ? 'top-12' : ''} p-2 rounded-lg transition-colors bg-white/90 hover:bg-white shadow-md`}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className="w-5 h-5 text-rose-500" fill={inWishlist ? "currentColor" : "none"} />
          </button>
        </div>

        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{product.category}</span>
        </div>
        <div className="flex items-center justify-between mt-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary text-lg">{getPriceDisplay()}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="text-xs text-accent">★</span>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>
      </div>
    </Link>
  );
}
