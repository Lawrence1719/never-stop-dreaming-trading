"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Image Area */}
      <div className="relative bg-muted rounded-lg overflow-hidden mb-4 aspect-square">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Title Lines */}
      <div className="space-y-2 mb-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Category line */}
      <div className="mb-2">
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Price line */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Rating line */}
      <div className="flex items-center gap-1">
        <Skeleton className="h-3 w-4" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}
