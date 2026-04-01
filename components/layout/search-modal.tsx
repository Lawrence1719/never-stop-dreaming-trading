"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowLeft, Clock, Star, Loader2, ChevronRight } from 'lucide-react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MAIN_CATEGORIES } from "@/lib/data/categories";
import { ProductImage } from "@/components/shared/ProductImage";

interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  price: number;
  rating: number;
  reviewCount: number;
  sku: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load recent searches and featured products
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("admin_recent_queries");
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved).slice(0, 5));
        } catch (e) {
          setRecentSearches([]);
        }
      }

      const fetchFeatured = async () => {
        try {
          const res = await fetch('/api/public/products');
          if (res.ok) {
            const json = await res.json();
            if (json?.data) {
              setFeaturedProducts(json.data.slice(0, 4).map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.minPrice || p.price,
                images: p.images || [p.image_url],
                category: p.category,
                rating: p.rating || 0
              })));
            }
          }
        } catch (e) {
          console.error('Failed to fetch featured products for search modal:', e);
        }
      };
      fetchFeatured();
      
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const saveToHistory = (term: string) => {
    if (!term || term.trim().length < 2) return;
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("admin_recent_queries", JSON.stringify(updated));
  };

  const removeFromHistory = (term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem("admin_recent_queries", JSON.stringify(updated));
  };

  const fetchResults = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}`);
      const { data } = await res.json();
      setResults(data || []);
    } catch (e) {
      console.error('Storefront search error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) fetchResults(query);
      else { setResults([]); setIsLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const handleSelect = (product: SearchResult) => {
    saveToHistory(query);
    onClose();
    router.push(`/products/${product.id}`);
  };

  const handleSearchSubmit = (term: string) => {
    saveToHistory(term);
    onClose();
    router.push(`/products?search=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        handleSearchSubmit(query);
      }
    }
  };

  const highlight = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((p, i) => p.toLowerCase() === term.toLowerCase() ? <span key={i} className="font-bold text-primary">{p}</span> : p);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div 
        ref={modalRef}
        className={cn(
          "relative bg-card shadow-2xl transition-all duration-300 ease-out flex flex-col w-full",
          "md:mt-20 md:rounded-2xl md:max-w-[600px] md:max-h-[520px] md:border md:border-border",
          "h-[100vh] md:h-auto" // Mobile full height
        )}
      >
        {/* Sticky Header Area */}
        <div className="sticky top-0 z-[20] bg-card border-b border-border/50 shadow-sm relative shrink-0">
          {/* Search Bar */}
          <div className="px-4 md:px-6 py-4 flex items-center gap-4">
            <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Search products..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-muted/50 border-none pl-10 pr-10 py-2.5 rounded-full text-base outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 transition-all"
              />
              {query && (
                <button 
                  onClick={() => setQuery("")}
                  className="absolute right-3 p-1 hover:bg-muted rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            <button 
              onClick={onClose} 
              className="hidden md:flex text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-full transition-all"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sticky Categories Hub (Visible when not searching) */}
          {!query && (
            <div className="px-4 md:px-6 pb-4 overflow-hidden relative">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 px-1 flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary" /> Browse Categories
              </h3>
              <div 
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 no-scrollbar overflow-y-hidden"
                style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' 
                }}
              >
                {MAIN_CATEGORIES.map((cat) => (
                  <Link
                    key={cat}
                    href={`/products?category=${encodeURIComponent(cat)}`}
                    onClick={onClose}
                    className="whitespace-nowrap px-4 py-2 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-muted/30 transition-all text-xs font-bold shadow-sm active:scale-95 shrink-0"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 custom-scrollbar scroll-smooth">
          
          {/* Pre-search view */}
          {!query ? (
            <div className="space-y-8">
              {/* Recent Searches (Pills) */}
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 px-1">
                    Recently Searched
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <div 
                        key={term}
                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 hover:bg-muted border border-border/50 rounded-full cursor-pointer transition-all active:scale-95"
                        onClick={() => setQuery(term)}
                      >
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{term}</span>
                        <button 
                          onClick={(e) => removeFromHistory(term, e)}
                          className="p-0.5 hover:bg-background rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured Products Grid */}
              {featuredProducts.length > 0 && (
                <div className="pb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 px-1">
                    Featured Products
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {featuredProducts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        onClick={onClose}
                        className="group bg-muted/20 border border-border/50 rounded-xl p-3 hover:border-primary/30 transition-all active:scale-[0.98] flex flex-col"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-muted shadow-inner relative shrink-0">
                          <ProductImage 
                            src={p.images[0]} 
                            alt={p.name} 
                            className="transition-transform group-hover:scale-110"
                          />
                        </div>
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-xs text-primary font-black mt-1">₱{p.price}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Search Results */
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Searching Catalog...</p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <div className="space-y-1">
                    {results.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left",
                          selectedIndex === idx ? "bg-primary text-primary-foreground shadow-lg active:scale-[0.99]" : "hover:bg-muted active:bg-muted/80"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 shadow-sm border border-border/20",
                          selectedIndex === idx ? "bg-white/20" : "bg-muted"
                        )}>
                          <ProductImage 
                            src={p.images[0]} 
                            alt={p.name} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm md:text-base font-bold truncate flex-1">
                              {highlight(p.name, query)}
                            </p>
                            {p.rating > 0 && (
                              <div className={cn(
                                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold",
                                selectedIndex === idx ? "bg-white/20" : "bg-primary/5 text-primary"
                               )}>
                                {p.rating} <Star className="w-2.5 h-2.5 fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "text-[10px] md:text-xs truncate font-medium",
                              selectedIndex === idx ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {p.category}
                            </p>
                             <p className={cn(
                               "text-xs md:text-sm font-black",
                               selectedIndex === idx ? "text-white" : "text-primary"
                             )}>
                               ₱{p.price}
                             </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* View All Button */}
                  <div className="pt-4 pb-2 px-1">
                    <button
                      onClick={() => handleSearchSubmit(query)}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      View all results for "{query}"
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-lg font-bold text-muted-foreground">No matches found for "{query}"</p>
                  <p className="text-sm text-muted-foreground/60 max-w-[280px] mx-auto">
                    Try checking for typos or searching with more general terms.
                  </p>
                  
                  {/* Category chips fallback */}
                  <div className="pt-8 px-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      Try Browsing Instead
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                       {MAIN_CATEGORIES.slice(0, 3).map((cat) => (
                        <Link
                          key={cat}
                          href={`/products?category=${encodeURIComponent(cat)}`}
                          onClick={onClose}
                          className="px-4 py-2 rounded-full border border-border bg-background hover:border-primary/50 transition-all text-xs font-bold"
                        >
                          {cat}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Navigation (Desktop Only) */}
        <div className="hidden md:flex sticky bottom-0 z-[20] bg-card border-t border-border px-6 py-3 items-center justify-between text-[10px] text-muted-foreground font-bold select-none shadow-[0_-2px_10px_rgba(0,0,0,0.05)] shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[9px] text-foreground">↑↓</kbd> to navigate</span>
            <span className="flex items-center gap-1.5"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[9px] text-foreground">↵</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1.5">
            <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[9px] text-foreground">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
