"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Banner } from "@/lib/types";
import { StorefrontBanner } from "./StorefrontBanner";

interface PlacementBannerProps {
  placement: string;
  className?: string;
}

export function PlacementBanner({ placement, className }: PlacementBannerProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .eq("placement", placement)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error(`Failed to fetch banners for ${placement}:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, [placement]);

  if (isLoading || banners.length === 0) {
    return null;
  }

  // Show the latest active banner for this placement
  return (
    <div className={className}>
      <StorefrontBanner banner={banners[0]} />
    </div>
  );
}
