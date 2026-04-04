"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { MAIN_CATEGORIES } from "@/lib/data/categories";
import type { User } from "@/lib/types";

export function ShopEngagementBelowFold({ user }: { user: User | null }) {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isTestimonialsLoading, setIsTestimonialsLoading] = useState(true);
  const [testimonialsError, setTestimonialsError] = useState<string | null>(null);

  const fetchTestimonials = async () => {
    setIsTestimonialsLoading(true);
    setTestimonialsError(null);
    try {
      const res = await fetch("/api/cms/testimonials");
      if (res.ok) {
        const json = await res.json();
        setTestimonials(json.data || []);
      } else {
        throw new Error("Failed to load testimonials");
      }
    } catch (err) {
      console.error("Failed to fetch testimonials:", err);
      setTestimonialsError("Unable to load feedback at this time.");
    } finally {
      setIsTestimonialsLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const categoryMeta: Record<string, { icon: string; desc: string }> = {
    "Food & Pantry": { icon: "🥫", desc: "Canned goods, staples & snacks" },
    Beverages: { icon: "🥤", desc: "Drinks: water, juice, coffee & more" },
    "Household Essentials": { icon: "🧽", desc: "Cleaning & paper products" },
    "Personal Care": { icon: "🧴", desc: "Toiletries & personal care" },
    "Refrigerated & Frozen": { icon: "🧊", desc: "Chilled & frozen items" },
  };

  return (
    <div className="space-y-0">
      <section className="py-16 border-t border-border/50 first:border-t-0 first:pt-0">
        <h2 className="text-2xl font-bold mb-8">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MAIN_CATEGORIES.map((name) => {
            const { icon, desc } = categoryMeta[name] || { icon: "📦", desc: "" };

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

      <section className="py-16">
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

      <section className="py-16 border-t border-border/50">
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
            <button type="button" onClick={fetchTestimonials} className="text-xs underline hover:no-underline">
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
                      className={`text-sm ${
                        starIdx < testimonial.rating ? "text-yellow-400" : "text-muted-foreground opacity-20"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic flex-1">&quot;{testimonial.comment}&quot;</p>
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
    </div>
  );
}
