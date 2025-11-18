import { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: Product[];
  title?: string;
}

export function ProductGrid({ products, title }: ProductGridProps) {
  return (
    <div>
      {title && <h2 className="text-2xl font-bold mb-8">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
