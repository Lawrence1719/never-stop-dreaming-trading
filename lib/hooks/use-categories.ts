"use client";

import { useState, useEffect } from "react";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

const cache: { data: Category[] | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache.data ?? []);
  const [isLoading, setIsLoading] = useState(cache.data === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Return cached data if still fresh
    if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      setCategories(cache.data);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/public/categories");
        if (!res.ok) throw new Error("Failed to load categories");
        const json = await res.json();
        const data: Category[] = json.data || [];
        if (!cancelled) {
          cache.data = data;
          cache.fetchedAt = Date.now();
          setCategories(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useCategories]", err);
          setError("Unable to load categories");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading, error };
}
