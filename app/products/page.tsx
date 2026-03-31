"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductFilter } from "@/components/ecommerce/product-filter";
import { CATEGORY_TREE } from "@/lib/data/categories";
import { supabase } from '@/lib/supabase/client';
import { Product } from "@/lib/types";
import { PlacementBanner } from '@/components/marketing/PlacementBanner';
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
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

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
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
  }, [selectedCategory, priceRange, sortBy, products]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">All Products</h1>
            <p className="text-muted-foreground mt-2">
              {isLoadingProducts ? (
                <span className="inline-block h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ) : (
                `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"} found`
              )}
            </p>
          </div>

          {/* Top Category Navigation */}
          <div className="mb-6">
            <div className="overflow-x-auto pb-2 scrollbar-hide select-none active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex gap-2 min-w-max px-1">
                <button
                  onClick={() => {
                    setSelectedCategory("");
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
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block lg:col-span-1 space-y-8">
              <ProductFilter
                onCategoryChange={(cat) => {
                  setSelectedCategory(cat);
                }}
                onPriceChange={(min, max) => setPriceRange([min, max])}
                onSortChange={setSortBy}
                sortBy={sortBy}
              />
              <PlacementBanner placement="sidebar" className="mt-8" />
            </div>

            {/* Mobile Filters Header/Button */}
            <div className="lg:hidden flex items-center justify-between mb-4 mt-[-1rem]">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Sort & Filter
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 border-primary/20 hover:border-primary/50">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] sm:h-[70vh] rounded-t-[20px] px-6 pt-10">
                  <SheetHeader className="mb-6">
                    <SheetTitle  className="text-xl font-bold">Preferences</SheetTitle>
                    <SheetDescription>
                      Adjust your product filters and sorting
                    </SheetDescription>
                  </SheetHeader>
                  <div className="overflow-y-auto h-full pb-20">
                    <ProductFilter
                      onCategoryChange={(cat) => {
                        setSelectedCategory(cat);
                      }}
                      onPriceChange={(min, max) => setPriceRange([min, max])}
                      onSortChange={setSortBy}
                      sortBy={sortBy}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="lg:col-span-4">
              <PlacementBanner placement="product_page" className="mb-6" />
              {filteredProducts.length > 0 || isLoadingProducts ? (
                <ProductGrid 
                  products={filteredProducts} 
                  loading={isLoadingProducts} 
                  skeletonCount={8}
                />
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
