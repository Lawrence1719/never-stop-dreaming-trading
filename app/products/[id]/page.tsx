"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { QuantitySelector } from "@/components/ecommerce/quantity-selector";
import { StockIndicator } from "@/components/ecommerce/stock-indicator";
import { useCart } from "@/lib/context/cart-context";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useToast } from "@/components/ui/toast";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { Heart, Share2, ChevronLeft } from 'lucide-react';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // TODO: Replace with actual API call to fetch product from Supabase
  // const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  const products: Product[] = [];
  const product = products.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const router = useRouter();
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toasts, addToast, removeToast } = useToast();

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product not found</h1>
            <Link href="/products" className="text-primary hover:underline">
              Back to products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedProducts = products.filter((p) => p.category === product.category && p.id !== product.id);
  const inWishlist = isInWishlist(product.id);
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  const handleAddToCart = () => {
    addItem(product.id, quantity);
    addToast("Added to cart", "success");
    setQuantity(1);
  };

  const handleWishlist = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
      addToast("Removed from wishlist", "info");
    } else {
      addToWishlist(product.id);
      addToast("Added to wishlist", "success");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Images */}
            <div className="space-y-4">
              <div className="bg-muted rounded-lg overflow-hidden">
                <img
                  src={product.images[imageIndex] || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIndex(i)}
                      className={`bg-muted rounded-lg overflow-hidden border-2 transition-colors ${
                        imageIndex === i ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={image || "/placeholder.svg"} alt="" className="w-full aspect-square object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-bold">{product.name}</h1>
                  <button
                    onClick={handleWishlist}
                    className={`p-2 rounded-full transition-colors ${
                      inWishlist
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Heart className="w-6 h-6" fill={inWishlist ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                  {product.compareAtPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.compareAtPrice)}
                    </span>
                  )}
                  {discount && <span className="text-sm font-bold text-accent">Save {discount}%</span>}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < Math.round(product.rating) ? "text-accent" : "text-muted"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} reviews)
                </span>
              </div>

              {/* Stock */}
              <div>
                <StockIndicator stock={product.stock} />
              </div>

              {/* Description */}
              <p className="text-muted-foreground">{product.description}</p>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <QuantitySelector
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  max={product.stock}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>
                <button
                  className="px-4 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Specifications */}
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-3">Specifications</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium">SKU</dt>
                    <dd className="text-sm text-muted-foreground">{product.sku}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium">Category</dt>
                    <dd className="text-sm text-muted-foreground">{product.category}</dd>
                  </div>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium">{key}</dt>
                      <dd className="text-sm text-muted-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="border-t border-border pt-16">
              <ProductGrid products={relatedProducts.slice(0, 4)} title="Related Products" />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
