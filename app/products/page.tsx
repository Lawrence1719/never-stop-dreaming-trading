"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductFilter } from "@/components/ecommerce/product-filter";
import { products } from "@/lib/mock/products";

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState("");

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Filter by price
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "newest") {
      result.sort((a, b) => b.id.localeCompare(a.id));
    }

    return result;
  }, [selectedCategory, priceRange, sortBy]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">All Products</h1>
            <p className="text-muted-foreground mt-2">
              {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"} found
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters */}
            <div className="lg:col-span-1">
              <ProductFilter
                onCategoryChange={setSelectedCategory}
                onPriceChange={setPriceRange}
                onSortChange={setSortBy}
              />
            </div>

            {/* Products */}
            <div className="lg:col-span-3">
              {filteredProducts.length > 0 ? (
                <ProductGrid products={filteredProducts} />
              ) : (
                <div className="text-center py-16">
                  <p className="text-xl text-muted-foreground">No products found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
