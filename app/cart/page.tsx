"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartItem } from "@/components/ecommerce/cart-item";
import { CartSummary } from "@/components/ecommerce/cart-summary";
import { useCart } from "@/lib/context/cart-context";
import { Product } from "@/lib/types";
import { ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const { cart } = useCart();

  // TODO: Replace with actual API call to fetch products from Supabase
  // const { data: products } = await supabase.from('products').select('*').in('id', cart.items.map(i => i.productId));
  const products: Product[] = [];

  // Build product objects for cart display. If we have full product data (from
  // a fetched products list) use that, otherwise synthesize a minimal Product
  // object from the cart item's stored details (name, price, image).
  const cartProducts = cart.items.map((item) => {
    const full = products.find((p) => p.id === item.productId);
    if (full) return { product: full, quantity: item.quantity };

    // Synthesize a Product-like object from cart item details so UI can render
    const synthesized: Product = {
      id: item.productId,
      name: item.name || "Product",
      slug: item.productId,
      description: "",
      price: item.price ?? 0,
      compareAtPrice: undefined,
      images: item.image ? [item.image] : ["/placeholder.svg"],
      category: "",
      stock: item.quantity,
      sku: "",
      rating: 0,
      reviewCount: 0,
      featured: false,
      specifications: {},
      iot: undefined,
    };

    return { product: synthesized, quantity: item.quantity };
  });

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">Start shopping to add items to your cart.</p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Continue Shopping
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
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="space-y-4">
                  {cartProducts.map(({ product, quantity }) => (
                    <CartItem key={product.id} product={product} quantity={quantity} />
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4 h-fit">
              <CartSummary subtotal={cart.total} />

              <Link
                href="/checkout"
                className="w-full block px-6 py-3 bg-primary text-primary-foreground text-center rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Proceed to Checkout
              </Link>

              <Link
                href="/products"
                className="w-full block px-6 py-3 border border-primary text-primary text-center rounded-lg hover:bg-primary/10 transition-colors font-semibold"
              >
                Continue Shopping
              </Link>

              {/* Coupon */}
              <div className="bg-card border border-border rounded-lg p-4">
                <label className="text-sm font-medium">Promo Code</label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
