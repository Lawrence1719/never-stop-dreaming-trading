"use client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { Product } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from 'lucide-react';
import { MAIN_CATEGORIES } from '@/lib/data/categories';

export default function Home() {
  // TODO: Replace with actual API call to fetch featured products from Supabase
  // const { data: featuredProducts } = await supabase.from('products').select('*').eq('featured', true);
  const products: Product[] = [];
  const featuredProducts = products.filter((p) => p.featured);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-accent/10 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6 text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-pretty">
                Never Stop Dreaming Trading
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
                Premium trading tools, education, and analytics for serious investors. Master the markets with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  Explore Products <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-semibold"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <ProductGrid products={featuredProducts} title="Featured Products" />
        </section>

        {/* Categories Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
          <div className="bg-primary text-primary-foreground rounded-lg p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Join Thousands of Traders</h2>
            <p className="text-lg mb-6 opacity-90">
              Get exclusive access to premium tools and stay ahead of the market.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-3 bg-primary-foreground text-primary rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              Create Free Account
            </Link>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold mb-8 text-center">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Professional Trader",
                quote: "The analytics tools have completely changed how I analyze markets. Highly recommended!",
              },
              {
                name: "Michael Rodriguez",
                role: "Financial Analyst",
                quote: "Best trading software I've used. The support team is incredibly responsive.",
              },
              {
                name: "Emma Thompson",
                role: "Beginner Investor",
                quote: "The courses are beginner-friendly yet comprehensive. Worth every penny.",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="bg-card border-t border-border py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-6">
              Subscribe to get the latest trading insights and exclusive offers.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
