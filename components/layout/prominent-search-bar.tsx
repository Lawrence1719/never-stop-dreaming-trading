"use client";

import { Search } from "lucide-react";
import { useSearch } from "@/lib/context/search-context";
import { cn } from "@/lib/utils";

interface ProminentSearchBarProps {
  className?: string;
  placeholder?: string;
}

export function ProminentSearchBar({ 
  className, 
  placeholder = "Search products..." 
}: ProminentSearchBarProps) {
  const { openSearch } = useSearch();

  return (
    <div className={cn("w-full md:hidden px-4", className)}>
      <button
        onClick={openSearch}
        className="w-full flex items-center gap-3 px-4 h-12 bg-background border border-border shadow-sm rounded-full text-muted-foreground hover:bg-accent/5 active:scale-[0.98] transition-all"
        aria-label="Open search"
      >
        <Search className="w-5 h-5 text-muted-foreground/60" />
        <span className="text-sm font-medium">{placeholder}</span>
      </button>
    </div>
  );
}
