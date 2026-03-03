"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductFilter } from "@/components/ecommerce/product-filter";
import { CATEGORY_TREE } from "@/lib/data/categories";
import { supabase } from '@/lib/supabase/client';
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
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
        const res = await fetch('/api/public/products', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json?.data && mounted) {
            const mapped = (json.data as any[]).map((row: any) => ({
              id: row.id,
              name: row.name,
              slug: row.slug || row.id,
              description: row.description || '',
              price: row.minPrice || Number(row.price) || 0,
              compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
              images: row.images || (row.image_url ? [row.image_url] : []),
              category: row.category || '',
              stock: row.totalStock ?? 0,
              sku: row.sku || '',
              rating: row.rating ?? 0,
              reviewCount: row.review_count ?? 0,
              featured: row.featured ?? false,
              specifications: row.specifications || {},
              iot: row.iot || undefined,
              reorder_threshold: row.reorder_threshold ?? undefined,
              updated_at: row.updated_at ?? undefined,
              is_active: row.is_active ?? undefined,
              variants: row.variants || [],
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
          .select(`
            *,
            product_variants (
              id,
              variant_label,
              price,
              stock,
              sku,
              is_active
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && mounted) {
          // Map DB rows to frontend Product shape
          const mapped = data.map((row: any) => {
            const variants = (row.product_variants || []).filter((v: any) => v.is_active);
            const prices = variants.map((v: any) => Number(v.price)).sort((a: number, b: number) => a - b);
            const minPrice = prices.length > 0 ? prices[0] : Number(row.price) || 0;
            const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);

            return {
              id: row.id,
              name: row.name,
              slug: row.slug || row.id,
              description: row.description || '',
              price: minPrice,
              compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
              images: row.image_url ? [row.image_url] : [],
              category: row.category || '',
              stock: totalStock,
              sku: row.sku || '',
              rating: row.rating ?? 0,
              reviewCount: row.review_count ?? 0,
              featured: row.featured ?? false,
              specifications: row.specifications || {},
              iot: row.iot || undefined,
              reorder_threshold: row.reorder_threshold ?? undefined,
              updated_at: row.updated_at ?? undefined,
              is_active: row.is_active ?? undefined,
              variants: variants,
            };
          }) as Product[];

          setProducts(mapped);
          setIsLoadingProducts(false);
          return;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch products from Supabase:', err);
      }

      if (mounted) {
        setProducts([]);
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
        // If main category has subcategories, show items matching EITHER:
        // - the parent category name directly, OR
        // - any of the subcategories
        result = result.filter((p) =>
          p.category === selectedCategory || subcats.includes(p.category)
        );
      } else {
        // No subcategories defined for this category - match directly
        result = result.filter((p) => p.category === selectedCategory);
      }
    }

    // Filter by price
    result = result.filter((p) => (p.price ?? 0) >= priceRange[0] && (p.price ?? 0) <= priceRange[1]);

    // Sort
    if (sortBy === "price-low") {
      result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
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
              {isLoadingProducts ? (
                <span className="inline-block h-4 w-32 bg-muted rounded animate-pulse" />
              ) : (
                `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"} found`
              )}
            </p>
          </div>

          {/* Top Category Navigation */}
          <div className="mb-8">
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                  }}
                  className={`rounded-full px-4 py-2 border-2 font-medium transition-all whitespace-nowrap ${selectedCategory === ""
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background hover:border-primary/50"
                    }`}
                >
                  All
                </button>
                {Object.keys(CATEGORY_TREE).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedSubcategory("");
                    }}
                    className={`rounded-full px-4 py-2 border-2 font-medium transition-all whitespace-nowrap ${selectedCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:border-primary/50"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <ProductFilter
                onCategoryChange={(cat) => {
                  setSelectedCategory(cat);
                  setSelectedSubcategory("");
                }}
                onSubcategoryChange={(sub) => setSelectedSubcategory(sub)}
                onPriceChange={(min, max) => setPriceRange([min, max])}
                onSortChange={setSortBy}
              />
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-4">
              {/* Subcategory chips (visible when category selected) */}
              {selectedCategory && CATEGORY_TREE[selectedCategory] && (
                <div className="mb-6 pb-6 border-b border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Subcategories</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedSubcategory("")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all border ${selectedSubcategory === ""
                        ? "bg-primary/10 text-primary border-primary"
                        : "border-border bg-background hover:bg-muted hover:border-primary/30"
                        }`}
                    >
                      All {selectedCategory}
                    </button>
                    {CATEGORY_TREE[selectedCategory].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubcategory(sub)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all border ${selectedSubcategory === sub
                          ? "bg-primary/10 text-primary border-primary"
                          : "border-border bg-background hover:bg-muted hover:border-primary/30"
                          }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3 animate-pulse">
                      <div className="h-40 bg-muted rounded-md" />
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-1/2 bg-muted rounded" />
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-20 bg-muted rounded" />
                        <div className="h-8 w-12 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
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
