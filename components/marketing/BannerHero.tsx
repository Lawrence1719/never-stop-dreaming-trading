"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Banner } from "@/lib/types";
import { StorefrontBanner } from "./StorefrontBanner";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function BannerHero() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .eq("placement", "homepage_hero")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error("Failed to fetch hero banners:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8" />
    );
  }

  // If we have banners, show the latest one (or implement a carousel later)
  if (banners.length > 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StorefrontBanner 
          banner={banners[0]} 
          className="shadow-xl" 
          priority 
        />
      </section>
    );
  }

  // Fallback to original static hero
  return (
    <section className="bg-gradient-to-r from-primary/10 to-accent/10 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-pretty">
            Never Stop Dreaming Online Grocery
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Fresh products, convenient delivery, and quality you can trust. Shop your daily essentials with ease.
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
  );
}
