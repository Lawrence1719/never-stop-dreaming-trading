"use client";

import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
}

export function ProductImage({ src, alt, className, containerClassName, style }: ProductImageProps) {
  const [error, setError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div 
        className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 transition-colors duration-200", 
          containerClassName || className
        )}
      >
        <ShoppingBag className="w-10 h-10 md:w-5 md:h-5 text-slate-300 dark:text-slate-600 mb-2 md:mb-0" />
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter md:hidden">
          No image
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={cn("object-cover w-full h-full transition-transform duration-300", className)}
      style={style}
    />
  );
}
