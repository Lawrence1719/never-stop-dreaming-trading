"use client";

import { Heart, Star } from 'lucide-react';
import Link from "next/link";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";

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
      toast({ title: "Login Required", description: "Please log in to add items to your wishlist.", variant: "warning" });
      return;
    }
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast({ title: "Removed from wishlist", variant: "info" });
    } else {
      addToWishlist(product.id);
      toast({ title: "Added to wishlist", variant: "success" });
    }
  };

  const discount = product.compareAtPrice
    ? Math.round((((product.compareAtPrice ?? 0) - (product.price ?? 0)) / (product.compareAtPrice ?? 1)) * 100)
    : null;

  // Determine price display based on variants
  const getPriceDisplay = () => {
    if (!hasVariants) {
      return formatPrice(product.price ?? 0);
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
    <Link href={`/products/${product.id}`} className="block h-full">
      <div className="group flex h-full cursor-pointer flex-col">
        <div className="relative bg-muted rounded-lg overflow-hidden mb-4">
          <ProductImage
            src={product.images?.[0]}
            alt={product.name}
            className="w-full aspect-square group-hover:scale-110"
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
          {product.doz_pckg && (
            <>
              <span className="text-xs text-muted-foreground/30">•</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                {product.doz_pckg}
              </span>
            </>
          )}
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
        <div
          className="mt-auto flex flex-wrap items-center gap-1.5 pt-1"
          role="img"
          aria-label={
            (product.reviewCount ?? 0) > 0
              ? `Rating: ${Number(product.rating ?? 0).toFixed(1)} out of 5 stars from ${product.reviewCount} reviews`
              : 'No ratings yet'
          }
        >
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => {
              const hasReviews = (product.reviewCount ?? 0) > 0;
              const filled = hasReviews && i <= Math.round(Number(product.rating ?? 0));
              return (
                <Star
                  key={i}
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    filled ? 'fill-accent text-accent' : 'text-muted-foreground/40',
                  )}
                  strokeWidth={filled ? 2 : 1.5}
                />
              );
            })}
          </div>
          {(product.reviewCount ?? 0) > 0 ? (
            <span className="text-xs tabular-nums text-muted-foreground" aria-hidden="true">
              {Number(product.rating ?? 0).toFixed(1)}{' '}
              <span className="text-muted-foreground/80">({product.reviewCount})</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              No reviews
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
