"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/ecommerce/product-card";
import { useWishlist } from "@/lib/context/wishlist-context";
import { Product } from "@/lib/types";
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function WishlistPage() {
  const { wishlist } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products that are in the wishlist
  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (wishlist.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('id', wishlist);

        if (error) throw error;

        if (data) {
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
          })) as Product[];

          setProducts(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch wishlist products:', err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlist]);

  const wishlistProducts = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];

  if (wishlist.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
            <p className="text-muted-foreground mb-8">Save your favorite items to view them later.</p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Start Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Wishlist</h1>
            <p className="text-muted-foreground mt-2">
              {isLoading ? (
                <span className="inline-block h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ) : (
                `${wishlist.length} ${wishlist.length === 1 ? "item" : "items"}`
              )}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(wishlist.length || 4)].map((_, i) => (
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
          ) : wishlistProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistProducts.map((product) => (
                <ProductCard key={product!.id} product={product!} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                Unable to load wishlist products. Please try again.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
