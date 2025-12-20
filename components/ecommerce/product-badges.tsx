"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Clock } from 'lucide-react';

interface ProductBadgesProps {
  stock: number;
  reorderThreshold?: number;
  featured?: boolean;
  purchaseCount?: number;
  isNew?: boolean;
  createdAt?: string;
}

export function ProductBadges({
  stock,
  reorderThreshold = 10,
  featured = false,
  purchaseCount = 0,
  isNew = false,
  createdAt,
}: ProductBadgesProps) {
  const badges: JSX.Element[] = [];

  // Low Stock Badge
  if (stock > 0 && stock <= reorderThreshold) {
    badges.push(
      <Badge key="low-stock" variant="destructive" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Only {stock} left
      </Badge>
    );
  }

  // Out of Stock
  if (stock === 0) {
    badges.push(
      <Badge key="out-of-stock" variant="secondary" className="opacity-60">
        Out of Stock
      </Badge>
    );
  }

  // Bestseller Badge (if purchase count is high)
  if (purchaseCount >= 50) {
    badges.push(
      <Badge key="bestseller" variant="accent" className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        Bestseller
      </Badge>
    );
  }

  // Featured Badge
  if (featured) {
    badges.push(
      <Badge key="featured" variant="default" className="flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Featured
      </Badge>
    );
  }

  // New Arrival Badge (if created within last 30 days)
  if (isNew || (createdAt && isProductNew(createdAt))) {
    badges.push(
      <Badge key="new" variant="default" className="bg-green-600 hover:bg-green-700">
        New Arrival
      </Badge>
    );
  }

  // High Stock Badge (if stock is very high)
  if (stock > 100) {
    badges.push(
      <Badge key="high-stock" variant="secondary" className="text-green-600 border-green-600">
        In Stock ({stock}+ units)
      </Badge>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges}
    </div>
  );
}

function isProductNew(createdAt: string): boolean {
  const createdDate = new Date(createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdDate >= thirtyDaysAgo;
}







