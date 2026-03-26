import { Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";

interface ProductGridProps {
  products: Product[];
  title?: string;
  loading?: boolean;
  error?: string | null;
  skeletonCount?: number;
  onRetry?: () => void;
}

export function ProductGrid({ 
  products, 
  title, 
  loading = false,
  error = null,
  skeletonCount = 4,
  onRetry
}: ProductGridProps) {
  return (
    <div>
      {title && <h2 className="text-2xl font-bold mb-8">{title}</h2>}
      
      {error ? (
        <div className="text-center py-12 bg-destructive/5 rounded-lg border border-destructive/10 px-4">
          <p className="text-destructive font-medium">{error}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="mt-4 text-sm underline hover:no-underline text-muted-foreground"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))
            : products.length === 0 && !loading ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No products found.
                </div>
              ) : (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
        </div>
      )}
    </div>
  );
}
