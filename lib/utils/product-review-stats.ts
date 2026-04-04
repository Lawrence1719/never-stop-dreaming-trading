import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/types';

/**
 * Overwrites product.rating / reviewCount using approved reviews from `reviews`.
 * Use when product row aggregates are missing or the storefront loads via anon Supabase fallback.
 */
export async function enrichProductsWithApprovedReviewStats(
  client: SupabaseClient,
  products: Product[],
): Promise<Product[]> {
  if (products.length === 0) return products;

  const ids = products.map((p) => p.id);
  const { data, error } = await client
    .from('reviews')
    .select('product_id, rating')
    .eq('status', 'approved')
    .in('product_id', ids);

  if (error) {
    console.error('enrichProductsWithApprovedReviewStats:', error.message);
    return products;
  }

  const stats = new Map<string, { sum: number; count: number }>();
  for (const row of data || []) {
    const pid = row.product_id as string;
    const prev = stats.get(pid) ?? { sum: 0, count: 0 };
    prev.sum += Number(row.rating) || 0;
    prev.count += 1;
    stats.set(pid, prev);
  }

  return products.map((p) => {
    const agg = stats.get(p.id);
    if (!agg || agg.count === 0) return p;
    return {
      ...p,
      rating: agg.sum / agg.count,
      reviewCount: agg.count,
    };
  });
}
