"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { Product } from "@/lib/types";
import { BannerHero } from '@/components/marketing/BannerHero';
import { supabase } from '@/lib/supabase/client';
import { ProminentSearchBar } from "@/components/layout/prominent-search-bar";
import { ShopEngagementBelowFold } from "@/components/marketing/shop-engagement-below-fold";

export default function Home() {
  const { user } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchFeaturedProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try fetching from public API first
      const res = await fetch('/api/public/products');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const mapped = (json.data as any[])
            .slice(0, 8) // Limit to 8 products
            .map((row: any) => ({
              id: row.id,
              name: row.name,
              slug: row.slug || row.id,
              description: row.description || '',
              price: row.minPrice || Number(row.price) || 0,
              compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
              images: row.images && row.images.length > 0 ? row.images : (row.image_url ? [row.image_url] : []),
              category: row.category || '',
              stock: row.totalStock ?? row.stock ?? 0,
              sku: row.sku || '',
              rating: row.rating ?? 0,
              reviewCount: row.review_count ?? 0,
              featured: row.featured ?? false,
            })) as Product[];

          setFeaturedProducts(mapped);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to direct Supabase query without featured filter
      const { data, error: sbError } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (
            id,
            price,
            stock,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (sbError) {
        throw sbError;
      }

      if (data) {
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
          };
        }) as Product[];

        setFeaturedProducts(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch featured products:', err);
      setError('Unable to load featured products. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <BannerHero />
        
        <div className="mt-[-16px] mb-8 relative z-10">
          <ProminentSearchBar placeholder="Search daily essentials..." />
        </div>

        {/* Featured Products */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <ProductGrid 
            products={featuredProducts} 
            title="Featured Products" 
            loading={isLoading}
            error={error}
            onRetry={fetchFeaturedProducts}
            skeletonCount={8}
          />
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ShopEngagementBelowFold user={user} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
