"use client";

import { useState } from "react";

interface ProductFilterProps {
  onCategoryChange: (category: string) => void;
  onPriceChange: (min: number, max: number) => void;
  onSortChange: (sort: string) => void;
}

export function ProductFilter({ onCategoryChange, onPriceChange, onSortChange }: ProductFilterProps) {
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedCategory, setSelectedCategory] = useState("");

  const categories = ["Software", "Education", "Subscription", "Reports"];

  return (
    <div className="space-y-6">
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

      {/* Category */}
      <div>
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="category"
              value=""
              checked={selectedCategory === ""}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                onCategoryChange("");
              }}
            />
            <span className="text-sm">All Products</span>
          </label>
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2">
              <input
                type="radio"
                name="category"
                value={cat}
                checked={selectedCategory === cat}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  onCategoryChange(e.target.value);
                }}
              />
              <span className="text-sm">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max="500"
            value={priceRange[1]}
            onChange={(e) => {
              const newRange = [priceRange[0], Number(e.target.value)];
              setPriceRange(newRange);
              onPriceChange(newRange[0], newRange[1]);
            }}
            className="w-full"
          />
          <div className="flex gap-2">
            <span className="text-sm">${priceRange[0]}</span>
            <span className="text-sm">-</span>
            <span className="text-sm">${priceRange[1]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
