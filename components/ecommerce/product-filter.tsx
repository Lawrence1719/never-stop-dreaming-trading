"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState } from "react";
import { useCategories } from "@/lib/hooks/use-categories";

interface ProductFilterProps {
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  sortBy?: string;
}

export function ProductFilter({ onCategoryChange, onSortChange, sortBy = "" }: ProductFilterProps) {
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const { categories, isLoading: categoriesLoading } = useCategories();

  const handleMainSelect = (cat: string) => {
    setSelectedMainCategory(cat);
    onCategoryChange(cat);
  };
 
   return (
     <div className="space-y-6 sticky top-20">
       {/* Sort */}
       <div>
         <h3 className="font-semibold mb-3">Sort By</h3>
         <SearchableSelect
           options={[
             { value: "", label: "Featured" },
             { value: "price-low", label: "Price: Low to High" },
             { value: "price-high", label: "Price: High to Low" },
             { value: "newest", label: "Newest" },
             { value: "rating", label: "Highest Rated" },
           ]}
           value={sortBy}
           onValueChange={onSortChange}
           placeholder="Sort by..."
           searchPlaceholder="Search sort options..."
         />
       </div>

      {/* Main Categories (Sidebar) */}
      <div>
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="space-y-2">
          <button
            onClick={() => handleMainSelect("")}
            className={`w-full text-left px-4 py-2 rounded-lg border-2 transition-all font-medium ${selectedMainCategory === "" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
          >
            All Products
          </button>

          {categoriesLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
            ))
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleMainSelect(cat.name)}
                className={`w-full text-left px-4 py-2 rounded-lg border-2 transition-all font-medium ${selectedMainCategory === cat.name ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
              >
                {cat.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
