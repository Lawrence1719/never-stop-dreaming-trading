"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductFilter } from "@/components/ecommerce/product-filter";
import { CATEGORY_TREE } from "@/lib/data/categories";
import { products as mockProducts } from "@/lib/mock/products";
import { supabase } from '@/lib/supabase/client';
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState("");

  // TODO: Replace with actual API call to fetch products from Supabase
  // const { data: products } = await supabase.from('products').select('*');
  // products state (will fetch from Supabase on mount, fallback to mock data)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      // Try server-side public API first (uses service key server-side to bypass RLS)
      try {
        const res = await fetch('/api/public/products');
        if (res.ok) {
          const json = await res.json();
          if (json?.data && mounted) {
            const mapped = (json.data as any[]).map((row: any) => ({
              id: row.id,
              name: row.name,
              slug: row.slug || row.id,
              description: row.description || '',
              price: Number(row.price) || 0,
              compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
              images: row.image_url ? [row.image_url] : [],
              category: row.category || '',
              stock: row.stock ?? 0,
              sku: row.sku || '',
              rating: row.rating ?? 0,
              reviewCount: row.review_count ?? 0,
              featured: row.featured ?? false,
              specifications: row.specifications || {},
              iot: row.iot || undefined,
              reorder_threshold: row.reorder_threshold ?? undefined,
              updated_at: row.updated_at ?? undefined,
              is_active: row.is_active ?? undefined,
            })) as Product[];

            setProducts(mapped);
            setIsLoadingProducts(false);
            return;
          }
        }
      } catch (err) {
        // ignore and fall back to client fetch / mock
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && mounted) {
          // Map DB rows to frontend Product shape
          const mapped = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            slug: row.slug || row.id,
            description: row.description || '',
            price: Number(row.price) || 0,
            compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
            images: row.image_url ? [row.image_url] : [],
            category: row.category || '',
            stock: row.stock ?? 0,
            sku: row.sku || '',
            rating: row.rating ?? 0,
            reviewCount: row.review_count ?? 0,
            featured: row.featured ?? false,
            specifications: row.specifications || {},
            iot: row.iot || undefined,
            reorder_threshold: row.reorder_threshold ?? undefined,
            updated_at: row.updated_at ?? undefined,
            is_active: row.is_active ?? undefined,
          })) as Product[];

          setProducts(mapped);
          setIsLoadingProducts(false);
          return;
        }
      } catch (err) {
        // fallback to mock data
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch products from Supabase, using mock data.', err);
      }

      if (mounted) {
        setProducts(mockProducts as Product[]);
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category + subcategory
    if (selectedCategory) {
      const subcats = CATEGORY_TREE[selectedCategory];
      if (selectedSubcategory) {
        result = result.filter((p) => p.category === selectedSubcategory);
      } else if (subcats && subcats.length > 0) {
        // If main category has subcategories, show items in any of those subcategories
        result = result.filter((p) => subcats.includes(p.category));
      } else {
        // No subcategories defined for this category - match directly
        result = result.filter((p) => p.category === selectedCategory);
      }
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
  }, [selectedCategory, selectedSubcategory, priceRange, sortBy, products]);

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
                onCategoryChange={(cat) => {
                  setSelectedCategory(cat);
                  setSelectedSubcategory("");
                }}
                onSubcategoryChange={(sub) => setSelectedSubcategory(sub)}
                onPriceChange={setPriceRange}
                onSortChange={setSortBy}
              />
            </div>

            {/* Products */}
            <div className="lg:col-span-3">
              {/* Subcategory chips (visible above products) */}
              {selectedCategory && CATEGORY_TREE[selectedCategory] && (
                <div className="mb-4">
                  <div className="overflow-x-auto py-2">
                    <div className="flex gap-2 px-2">
                      <button
                        onClick={() => setSelectedSubcategory("")}
                        className={`rounded-full px-3 py-1 border ${selectedSubcategory === "" ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        All
                      </button>
                      {CATEGORY_TREE[selectedCategory].map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`rounded-full px-3 py-1 border ${selectedSubcategory === sub ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
