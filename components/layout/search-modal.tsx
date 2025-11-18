"use client";

import { useState, useEffect } from "react";
import { Search, X } from 'lucide-react';
import { products } from "@/lib/mock/products";
import Link from "next/link";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSearch = () => {
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    }
  };

  const filteredProducts = query
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-input px-3 py-2 rounded-md">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-foreground"
            />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query ? (
            filteredProducts.length > 0 ? (
              <div className="p-4 space-y-2">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/10 transition-colors"
                  >
                    <img
                      src={product.images[0] || "/placeholder.svg"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">${product.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No products found for "{query}"
              </div>
            )
          ) : recentSearches.length > 0 ? (
            <div className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">RECENT SEARCHES</p>
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => setQuery(search)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary/10 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Start typing to search for products
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
