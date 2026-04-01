"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { Product } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, AlertCircle } from 'lucide-react';
import { MAIN_CATEGORIES } from '@/lib/data/categories';
import { BannerHero } from '@/components/marketing/BannerHero';
import { supabase } from '@/lib/supabase/client';
import { ProminentSearchBar } from "@/components/layout/prominent-search-bar";
import { NewsletterForm } from "@/components/marketing/NewsletterForm";

export default function Home() {
  const { user } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isTestimonialsLoading, setIsTestimonialsLoading] = useState(true);
  const [testimonialsError, setTestimonialsError] = useState<string | null>(null);

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

  const fetchTestimonials = async () => {
    setIsTestimonialsLoading(true);
    setTestimonialsError(null);
    try {
      const res = await fetch('/api/cms/testimonials');
      if (res.ok) {
        const json = await res.json();
        setTestimonials(json.data || []);
      } else {
        throw new Error('Failed to load testimonials');
      }
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
      setTestimonialsError('Unable to load feedback at this time.');
    } finally {
      setIsTestimonialsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedProducts();
    fetchTestimonials();
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

        {/* Categories Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border/50">
          <h2 className="text-2xl font-bold mb-8">Shop by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MAIN_CATEGORIES.map((name) => {
              const meta: Record<string, { icon: string; desc: string }> = {
                'Food & Pantry': { icon: '🥫', desc: 'Canned goods, staples & snacks' },
                Beverages: { icon: '🥤', desc: 'Drinks: water, juice, coffee & more' },
                'Household Essentials': { icon: '🧽', desc: 'Cleaning & paper products' },
                'Personal Care': { icon: '🧴', desc: 'Toiletries & personal care' },
                'Refrigerated & Frozen': { icon: '🧊', desc: 'Chilled & frozen items' },
              };

              const { icon, desc } = meta[name] || { icon: '📦', desc: '' };

              return (
                <Link
                  key={name}
                  href={`/products?category=${encodeURIComponent(name)}`}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{name}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-primary text-primary-foreground rounded-lg p-12 text-center shadow-xl">
            <h2 className="text-3xl font-bold mb-4">
              {user ? "Ready for Your Next Order?" : "Join Thousands of Happy Shoppers"}
            </h2>
            <p className="text-lg mb-6 opacity-90">
              {user 
                ? "Browse our latest arrivals and grab the freshest deals today." 
                : "Get exclusive access to the freshest deals and stay updated on our weekly stocks."}
            </p>
            <Link
              href={user ? "/products" : "/register"}
              className="inline-block px-8 py-3 bg-primary-foreground text-primary rounded-[2rem] hover:scale-105 transition-all font-bold shadow-md"
            >
              {user ? "Shop Fresh Deals Now" : "Create Free Account"}
            </Link>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border/50">
          <h2 className="text-2xl font-bold mb-8 text-center">What Our Users Say</h2>
          
          {isTestimonialsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-200 dark:bg-slate-700 animate-pulse h-40 rounded-lg" />
              ))}
            </div>
          ) : testimonialsError ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 opacity-20" />
              <p>{testimonialsError}</p>
              <button 
                onClick={fetchTestimonials}
                className="text-xs underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No testimonials yet. Be the first to share your experience!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial, i) => (
                <div key={testimonial.id || i} className="bg-card border border-border rounded-lg p-6 flex flex-col h-full">
                  <div 
                    className="flex gap-1 mb-4" 
                    role="img" 
                    aria-label={`${testimonial.rating} out of 5 stars`}
                  >
                    {[...Array(5)].map((_, starIdx) => (
                      <span 
                        key={starIdx} 
                        aria-hidden="true"
                        className={`text-sm ${starIdx < testimonial.rating ? 'text-yellow-400' : 'text-muted-foreground opacity-20'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic flex-1">"{testimonial.comment}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    {testimonial.product?.name && (
                      <p className="text-xs text-primary font-medium mt-1">
                        Verified Buyer: {testimonial.product.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter */}
        <section className="bg-card border-t border-border py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-6">
              Subscribe to get the latest deals, promos, and exclusive offers.
            </p>
            <NewsletterForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
