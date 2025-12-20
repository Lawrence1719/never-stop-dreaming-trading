"use client";

import { Product } from "@/lib/types";
import { Star, MessageSquare } from 'lucide-react';

interface ProductReviewsProps {
  product: Product;
}

export function ProductReviews({ product }: ProductReviewsProps) {
  // For now, show a placeholder encouraging reviews
  // In the future, this will display actual reviews from the database

  if (product.reviewCount === 0) {
    return (
      <div className="border-t border-border pt-8 mt-8">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
        </div>
        
        <div className="bg-secondary/10 border border-border rounded-lg p-8 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-muted fill-muted" />
            ))}
          </div>
          <h3 className="text-lg font-semibold mb-2">Be the first to review this product!</h3>
          <p className="text-muted-foreground mb-4">
            Share your experience with other customers and help them make informed decisions.
          </p>
          <p className="text-sm text-muted-foreground">
            Reviews will appear here once customers start sharing their feedback.
          </p>
        </div>
      </div>
    );
  }

  // When reviews exist, they'll be displayed here
  return (
    <div className="border-t border-border pt-8 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5" />
        <h2 className="text-2xl font-bold">Customer Reviews ({product.reviewCount})</h2>
      </div>
      
      <div className="space-y-4">
        {/* Reviews will be mapped here */}
        <p className="text-muted-foreground text-center py-8">
          Review display coming soon. {product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''} available.
        </p>
      </div>
    </div>
  );
}







