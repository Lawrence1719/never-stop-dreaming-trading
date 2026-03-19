"use client";

import { useState } from "react";
import { CATEGORY_TREE, MAIN_CATEGORIES } from "@/lib/data/categories";

interface ProductFilterProps {
  onCategoryChange: (category: string) => void;
  onPriceChange: (min: number, max: number) => void;
  onSortChange: (sort: string) => void;
  // Optional: notified when subcategory changes
  onSubcategoryChange?: (subcategory: string) => void;
}

export function ProductFilter({ onCategoryChange, onPriceChange, onSortChange, onSubcategoryChange }: ProductFilterProps) {
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const handleMainSelect = (cat: string) => {
    setSelectedMainCategory(cat);
    setSelectedSubcategory("");
    onCategoryChange(cat);
    onSubcategoryChange?.("");
  };

  const handleSubSelect = (sub: string) => {
    setSelectedSubcategory(sub);
    onSubcategoryChange?.(sub);
  };

  return (
    <div className="space-y-6 sticky top-20">
      {/* Sort */}
      <div>
        <h3 className="font-semibold mb-3">Sort By</h3>
        <select
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="newest">Newest</option>
          <option value="rating">Highest Rated</option>
        </select>
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

          {MAIN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleMainSelect(cat)}
              className={`w-full text-left px-4 py-2 rounded-lg border-2 transition-all font-medium ${selectedMainCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subcategories (shown when main category selected) */}
      {selectedMainCategory && CATEGORY_TREE[selectedMainCategory] && (
        <div>
          <h3 className="font-semibold mb-3 text-sm">{selectedMainCategory}</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleSubSelect("")}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${selectedSubcategory === "" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
            >
              All {selectedMainCategory}
            </button>
            {CATEGORY_TREE[selectedMainCategory].map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubSelect(sub)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${selectedSubcategory === sub ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max="10000"
            value={priceRange[1]}
            onChange={(e) => {
              const newRange = [priceRange[0], Number(e.target.value)];
              setPriceRange(newRange);
              onPriceChange(newRange[0], newRange[1]);
            }}
            className="w-full"
          />
          <div className="flex gap-2">
            <span className="text-sm font-medium text-primary">₱{new Intl.NumberFormat().format(priceRange[0])}</span>
            <span className="text-sm text-muted-foreground">-</span>
            <span className="text-sm font-medium text-primary">₱{new Intl.NumberFormat().format(priceRange[1])}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
