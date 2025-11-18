"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/ecommerce/product-card";
import { useWishlist } from "@/lib/context/wishlist-context";
import { products } from "@/lib/mock/products";
import { Heart } from 'lucide-react';

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  const wishlistProducts = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

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
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistProducts.map((product) => (
              <ProductCard key={product!.id} product={product!} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
