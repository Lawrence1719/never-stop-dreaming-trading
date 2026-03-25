"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banner } from "@/lib/types";
import { BannerTracking } from "@/lib/services/BannerTracking";
import { cn } from "@/lib/utils";

interface StorefrontBannerProps {
  banner: Banner;
  className?: string;
  priority?: boolean;
}

export function StorefrontBanner({ banner, className, priority = false }: StorefrontBannerProps) {
  const impressionRecorded = useRef(false);

  useEffect(() => {
    if (!impressionRecorded.current && banner.id) {
      BannerTracking.recordImpression(banner.id);
      impressionRecorded.current = true;
    }
  }, [banner.id]);

  const handleClick = () => {
    if (banner.id) {
      BannerTracking.recordClick(banner.id);
    }
  };

  const content = (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {banner.image_url ? (
        <div className="relative aspect-[21/9] w-full">
          <Image
            src={banner.image_url}
            alt={banner.title}
            fill
            className="object-cover"
            priority={priority}
          />
        </div>
      ) : (
        <div className="bg-muted aspect-[21/9] flex items-center justify-center p-8 text-center">
          <h3 className="text-2xl font-bold">{banner.title}</h3>
        </div>
      )}
    </div>
  );

  if (banner.link_url) {
    return (
      <Link 
        href={banner.link_url} 
        onClick={handleClick}
        className="block hover:opacity-95 transition-opacity"
      >
        {content}
      </Link>
    );
  }

  return content;
}
