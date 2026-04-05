"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { ProductFilter } from "@/components/ecommerce/product-filter";
import { CATEGORY_TREE } from "@/lib/data/categories";
import { supabase } from '@/lib/supabase/client';
import { enrichProductsWithApprovedReviewStats } from '@/lib/utils/product-review-stats';
import { Product } from "@/lib/types";
import { PlacementBanner } from '@/components/marketing/PlacementBanner';
import { SlidersHorizontal, SearchX } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ProminentSearchBar } from "@/components/layout/prominent-search-bar";

function ProductsContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || "";
  const categoryParam = searchParams.get('category') || "";

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Sync category state with URL param
  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
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

            const withReviews = await enrichProductsWithApprovedReviewStats(supabase, mapped);
            setProducts(withReviews);
            setIsLoadingProducts(false);
            return;
          }
        }
      } catch (err) {
        // Fallback handled below
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_variants (
              id, variant_label, price, stock, sku, is_active
            )
          `)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });


        if (error) throw error;

        if (data && mounted) {
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

          const withReviews = await enrichProductsWithApprovedReviewStats(supabase, mapped);
          setProducts(withReviews);
          setIsLoadingProducts(false);
        }
      } catch (err) {
        console.error('Failed to fetch storefront products:', err);
        if (mounted) {
          setProducts([]);
          setIsLoadingProducts(false);
        }
      }
    };

    fetchProducts();
    return () => { mounted = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query Filter
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.description.toLowerCase().includes(s) || 
        p.category.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s)
      );
    }

    // 2. Category Filter
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 3. Price Filter
    result = result.filter((p) => (p.price ?? 0) >= priceRange[0] && (p.price ?? 0) <= priceRange[1]);

    // 4. Sort
    if (sortBy === "price-low") result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sortBy === "price-high") result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "newest") result.sort((a, b) => b.id.localeCompare(a.id));

    return result;
  }, [searchQuery, selectedCategory, priceRange, sortBy, products]);

  return (
    <main className="flex-1">
      {/* Sticky Mobile Search & Categories */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 md:hidden">
        <div className="pt-4 pb-2">
          <ProminentSearchBar placeholder="Search in all products..." />
        </div>
        
        {/* Horizontal Category Chips (Sticky Mobile) */}
        <div className="overflow-hidden px-4 pb-3">
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory("")}
                className={cn(
                  "rounded-full px-4 py-1.5 border-2 font-bold text-xs transition-all whitespace-nowrap",
                  selectedCategory === "" 
                    ? "bg-primary text-primary-foreground border-primary shadow-md" 
                    : "border-border bg-background hover:border-primary/50"
                )}
              >
                All Items
              </button>
              {Object.keys(CATEGORY_TREE).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-full px-4 py-1.5 border-2 font-bold text-xs transition-all whitespace-nowrap",
                    selectedCategory === cat 
                      ? "bg-primary text-primary-foreground border-primary shadow-md" 
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {searchQuery ? `Search Results` : `All Products`}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <p className="text-muted-foreground">
              {isLoadingProducts ? (
                <span className="inline-block h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ) : (
                `${filteredProducts.length} products found`
              )}
            </p>
            {searchQuery && (
              <Badge variant="secondary" className="w-fit text-xs font-medium">
                Showing results for "{searchQuery}"
              </Badge>
            )}
          </div>
        </div>

        {/* Categories Section (Desktop only or fallback) */}
        <div className="mb-8 overflow-hidden hidden md:block">
          <div className="overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory("")}
                className={cn(
                  "rounded-full px-5 py-2 border-2 font-bold text-sm transition-all whitespace-nowrap",
                  selectedCategory === "" 
                    ? "bg-primary text-primary-foreground border-primary shadow-md" 
                    : "border-border bg-background hover:border-primary/50"
                )}
              >
                All Items
              </button>
              {Object.keys(CATEGORY_TREE).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-full px-5 py-2 border-2 font-bold text-sm transition-all whitespace-nowrap",
                    selectedCategory === cat 
                      ? "bg-primary text-primary-foreground border-primary shadow-md" 
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block lg:col-span-1 space-y-8">
            <ProductFilter
              onCategoryChange={setSelectedCategory}
              onPriceChange={(min, max) => setPriceRange([min, max])}
              onSortChange={setSortBy}
              sortBy={sortBy}
            />
            <PlacementBanner placement="sidebar" className="mt-8" />
          </aside>

          {/* Mobile Filters Trigger */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <Badge variant="outline" className="px-3 py-1 font-bold text-[10px] uppercase tracking-widest text-muted-foreground border-border/50">
              Refine Search
            </Badge>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 font-bold border-primary/20 bg-card shadow-sm active:scale-95 transition-all">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-[32px] px-6 pt-12 shadow-2xl">
                <SheetHeader className="mb-8">
                  <SheetTitle className="text-2xl font-black tracking-tight">Preferences</SheetTitle>
                  <SheetDescription className="font-medium">
                    Customize your product view and sorting
                  </SheetDescription>
                </SheetHeader>
                <div className="overflow-y-auto h-full pb-32">
                  <ProductFilter
                    onCategoryChange={setSelectedCategory}
                    onPriceChange={(min, max) => setPriceRange([min, max])}
                    onSortChange={setSortBy}
                    sortBy={sortBy}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Product Listing */}
          <div className="lg:col-span-4">
            <PlacementBanner placement="product_page" className="mb-8" />
            
            {filteredProducts.length > 0 || isLoadingProducts ? (
              <ProductGrid 
                products={filteredProducts} 
                loading={isLoadingProducts} 
                skeletonCount={8}
              />
            ) : (
              <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50 flex flex-col items-center gap-4">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                  <SearchX className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <div className="max-w-xs mx-auto">
                  <p className="text-xl font-bold text-foreground">No matches found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    We couldn't find any products matching your current filters or search term.
                  </p>
                  <Button 
                    variant="link" 
                    className="mt-4 font-bold text-primary"
                    onClick={() => {
                      setSelectedCategory("");
                      setPriceRange([0, 10000]);
                      setSortBy("");
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ProductsSkeleton() {
  return (
    <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-10 w-48 bg-muted rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="hidden lg:block h-96 bg-muted rounded" />
        <div className="lg:col-span-4 space-y-8">
          <div className="h-64 bg-muted rounded" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
