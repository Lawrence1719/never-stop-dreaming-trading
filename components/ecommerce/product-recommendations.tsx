"use client";

import { Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { ProductGrid } from "./product-grid";

interface ProductRecommendationsProps {
  currentProduct: Product;
  allProducts: Product[];
  type?: 'frequently-bought' | 'similar' | 'category';
}

export function ProductRecommendations({ 
  currentProduct, 
  allProducts,
  type = 'similar'
}: ProductRecommendationsProps) {
  // Get similar products (same category, different product)
  const similarProducts = allProducts
    .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
    .slice(0, 4);

  // Get frequently bought together (complementary products from different categories)
  const frequentlyBoughtTogether = allProducts
    .filter(p => {
      // For food items, suggest complementary items
      if (currentProduct.category === 'Food & Pantry') {
        return ['Beverages', 'Household Essentials'].includes(p.category);
      }
      return p.category !== currentProduct.category;
    })
    .slice(0, 3);

  // Get bestsellers in category
  const categoryBestsellers = allProducts
    .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 4);

  if (type === 'frequently-bought' && frequentlyBoughtTogether.length === 0) {
    return null;
  }

  if (type === 'similar' && similarProducts.length === 0) {
    return null;
  }

  if (type === 'category' && categoryBestsellers.length === 0) {
    return null;
  }

  const products = type === 'frequently-bought' 
    ? frequentlyBoughtTogether 
    : type === 'category'
    ? categoryBestsellers
    : similarProducts;

  const title = type === 'frequently-bought'
    ? 'Frequently Bought Together'
    : type === 'category'
    ? `Popular in ${currentProduct.category}`
    : 'Similar Products';

  return (
    <div className="border-t border-border pt-8 mt-8">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <ProductGrid products={products} />
    </div>
  );
}






