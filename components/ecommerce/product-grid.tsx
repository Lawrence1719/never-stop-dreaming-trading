import { Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";

interface ProductGridProps {
  products: Product[];
  title?: string;
  loading?: boolean;
  skeletonCount?: number;
}

export function ProductGrid({ 
  products, 
  title, 
  loading = false,
  skeletonCount = 4
}: ProductGridProps) {
  return (
    <div>
      {title && <h2 className="text-2xl font-bold mb-8">{title}</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          : products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </div>
  );
}
