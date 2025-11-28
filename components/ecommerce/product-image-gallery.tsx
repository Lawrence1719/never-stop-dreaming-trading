"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  // If no images, show placeholder
  const displayImages = images.length > 0 ? images : ["/placeholder.svg"];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <div className="space-y-4">
      {/* Main Image - Larger on desktop */}
      <div className="relative bg-muted rounded-lg overflow-hidden group">
        <div
          className="relative w-full aspect-square md:aspect-[4/3] cursor-zoom-in"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsZoomed(false)}
          onClick={toggleZoom}
        >
          <img
            src={displayImages[selectedIndex]}
            alt={productName}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
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
          {/* Zoom Indicator */}
          {!isZoomed && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium">
                <ZoomIn className="w-4 h-4" />
                Click to zoom
              </div>
            </div>
          )}
          {/* Zoom Controls */}
          {isZoomed && (
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(false);
                }}
                className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/90 transition-colors"
                title="Close zoom"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Navigation Arrows (Mobile) */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
                }}
                className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all shadow-lg"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
                }}
                className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all shadow-lg"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail Gallery - Enhanced */}
      {displayImages.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedIndex(index);
                setIsZoomed(false);
              }}
              className={`bg-muted rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20 shadow-lg"
                  : "border-transparent hover:border-primary/50"
              }`}
            >
              <img
                src={image}
                alt={`${productName} view ${index + 1}`}
                className="w-full aspect-square object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Mobile Swipe Indicator */}
      {displayImages.length > 1 && (
        <div className="md:hidden flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Swipe to view more images</span>
          <span className="text-xs">
            {selectedIndex + 1} / {displayImages.length}
          </span>
        </div>
      )}
    </div>
  );
}

