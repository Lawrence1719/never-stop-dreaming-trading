"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // If no images, show placeholder
  const displayImages = images && images.length > 0 ? images : [null];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Zoom on hover logic
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    if (!isZoomed) setIsZoomed(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.targetTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Threshold for swipe
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left -> Next
        setSelectedIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
      } else {
        // Swipe right -> Prev
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
      }
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  return (
    <div className="space-y-4">
      {/* Main Image - Larger on desktop */}
      <div className="relative bg-muted rounded-xl overflow-hidden group shadow-sm border border-border/50">
        <div
          className="relative w-full aspect-square md:aspect-[4/4] cursor-crosshair overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsZoomed(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ProductImage
            src={displayImages[selectedIndex]}
            alt={productName}
            className={`transition-transform duration-200 ease-out ${
              isZoomed ? 'scale-[2.5]' : 'scale-100'
            }`}
            containerClassName={cn("w-full h-full", isZoomed ? "overflow-visible" : "overflow-hidden")}
            style={{
              transformOrigin: isZoomed ? `${zoomPosition.x}% ${zoomPosition.y}%` : 'center',
            }}
          />
          {/* Image Counter */}
          {displayImages.length > 1 && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
              {selectedIndex + 1} / {displayImages.length}
            </div>
          )}
          {/* Zoom Indicator (Desktop Only) */}
          <div className="hidden md:flex absolute inset-0 pointer-events-none items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {!isZoomed && (
              <div className="bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 font-medium">
                <ZoomIn className="w-3 h-3" />
                Hover to zoom
              </div>
            )}
          </div>
          {/* Navigation Arrows (Visible on hover on Desktop) */}
          {displayImages.length > 1 && !isZoomed && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-foreground p-3 rounded-full hover:bg-white dark:hover:bg-black shadow-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-foreground p-3 rounded-full hover:bg-white dark:hover:bg-black shadow-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {displayImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedIndex(index);
                setIsZoomed(false);
              }}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <ProductImage
                src={image}
                alt={`${productName} view ${index + 1}`}
                className="w-full h-full"
              />
            </button>
          ))}
        </div>
      )}

      {/* Mobile Swipe Indicator */}
      {displayImages.length > 1 && (
        <div className="md:hidden flex flex-col items-center justify-center gap-2 py-2">
           <div className="flex gap-1.5">
            {displayImages.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all ${i === selectedIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Swipe to view
          </span>
        </div>
      )}
    </div>
  );
}

