# Integration Guide - Using Variants in Product Display Pages

This guide shows how to update existing product display components to use the new variant system.

## VariantSelector Component Usage

The `VariantSelector` component is a reusable dropdown for customers to choose product variants.

### Basic Usage

```tsx
import { VariantSelector } from "@/components/ecommerce/variant-selector";
import { ProductVariant } from "@/lib/types";
import { useState } from "react";

export function ProductDetail({ product }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  if (!selectedVariant && product.variants?.length > 0) {
    setSelectedVariant(product.variants[0]);
  }

  return (
    <div className="space-y-6">
      {/* Product Title and Description */}
      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground mt-2">{product.description}</p>
      </div>

      {/* Variant Selector */}
      {product.variants && product.variants.length > 0 && (
        <VariantSelector
          variants={product.variants}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
          label="Choose Size/Weight"
        />
      )}

      {/* Price Display */}
      {selectedVariant && (
        <div className="space-y-2">
          <div className="text-3xl font-bold">₱{Number(selectedVariant.price).toFixed(2)}</div>
          {selectedVariant.stock === 0 ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : (
            <Badge variant="secondary">{selectedVariant.stock} in stock</Badge>
          )}
        </div>
      )}

      {/* Add to Cart Button */}
      <Button
        onClick={() => addToCart(selectedVariant)}
        disabled={!selectedVariant || selectedVariant.stock === 0}
      >
        Add to Cart
      </Button>
    </div>
  );
}
```

## Updating Cart Logic

### Before (Single Product)
```tsx
// OLD - storing product-level data
cart.push({
  productId: "prod-123",
  quantity: 1,
  price: 250,
  name: "Basmati Rice"
});
```

### After (With Variants)
```tsx
// NEW - storing variant-level data
cart.push({
  productId: product.id,
  variantId: selectedVariant.id,  // KEY CHANGE
  quantity: 1,
  price: selectedVariant.price,   // From variant
  sku: selectedVariant.sku,       // From variant
  variantLabel: selectedVariant.variant_label,  // e.g., "1kg"
  name: product.name
});
```

## Updating Product Grid/List Pages

### Before (No Variants)
```tsx
// app/products/page.tsx - OLD

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const product = products[0];
  return (
    <ProductCard
      name={product.name}
      price={product.price}        // ❌ No longer available
      stock={product.stock}        // ❌ No longer available
      image={product.images[0]}
    />
  );
}
```

### After (With Variants)
```tsx
// app/products/page.tsx - NEW

import { VariantSelector } from "@/components/ecommerce/variant-selector";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const product = products[0];
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0]);

  return (
    <ProductCard
      name={product.name}
      price={selectedVariant?.price || product.minPrice}  // From variant
      stock={product.totalStock}    // Total across all variants
      image={product.images[0]}
    >
      {/* Show variant selector in card or on detail page */}
      {product.variants && product.variants.length > 1 && (
        <VariantSelector
          variants={product.variants}
          onSelectVariant={setSelectedVariant}
          label="Choose size"
        />
      )}
    </ProductCard>
  );
}
```

## Updating Product Mapping

The public API now returns variants automatically. Update your data mapping:

```tsx
// Before (OLD - single price/stock)
const mapped = data.map((row: any) => ({
  id: row.id,
  name: row.name,
  price: Number(row.price),        // ❌ No longer exists
  stock: row.stock,                // ❌ No longer exists
  sku: row.sku,                    // ❌ Moved to variants
}));

// After (NEW - variants included)
const mapped = data.map((row: any) => ({
  id: row.id,
  name: row.name,
  price: row.minPrice,             // ✅ From computed field
  stock: row.totalStock,           // ✅ From computed field
  variants: row.variants,          // ✅ Array of variants
  totalStock: row.totalStock,      // ✅ Sum of variant stocks
  minPrice: row.minPrice,          // ✅ Lowest variant price
  maxPrice: row.maxPrice,          // ✅ Highest variant price
}));
```

## Handling Backward Compatibility

If you have code expecting `product.price` and `product.stock`:

```tsx
// Use computed fields from API response
function getProductPrice(product) {
  return product.minPrice ?? product.price ?? 0;  // Falls back to old field if it exists
}

function getProductStock(product) {
  return product.totalStock ?? product.stock ?? 0;
}

// In components:
<span className="price">₱{getProductPrice(product).toFixed(2)}</span>
<span className="stock">{getProductStock(product)} in stock</span>
```

## Update Cart Item Display

When showing cart items, display variant information:

```tsx
// CartItem component

interface CartItemProps {
  productId: string;
  variantId: string;    // NEW
  name: string;
  price: number;
  quantity: number;
  variantLabel?: string; // NEW - e.g., "1kg"
  sku?: string;          // NEW
}

export function CartItem({ 
  name, 
  price, 
  quantity, 
  variantLabel,  // Show size/weight
  sku            // Optional: show SKU
}: CartItemProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="font-medium">{name}</p>
        {variantLabel && (
          <p className="text-sm text-muted-foreground">{variantLabel}</p>
        )}
      </div>
      <p>₱{price.toFixed(2)} × {quantity}</p>
    </div>
  );
}
```

## Update Checkout/Orders

Order items now reference variants:

```tsx
// Before (OLD)
const orderItem = {
  productId: "prod-123",
  name: "Basmati Rice",
  price: 250,
  quantity: 2
};

// After (NEW)
const orderItem = {
  variantId: "var-123",           // ✅ Primary identifier
  productId: "prod-123",          // Optional: for context
  name: "Basmati Rice",
  variantLabel: "1kg",            // What the customer ordered
  sku: "RICE-1KG-001",           // For fulfillment
  price: 250,
  quantity: 2
};
```

## Search and Filter Updates

If you have search/filter functionality, update category queries:

```tsx
// Filter by category still works - returns all products in that category
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('category', 'Rice & grains');

// Filter by product name
const { data: products } = await supabase
  .from('products')
  .select('*')
  .ilike('name', `%basmati%`);

// Get product with variants
const { data: product } = await supabase
  .from('products')
  .select(`
    *,
    product_variants(*)
  `)
  .eq('id', 'prod-123')
  .single();
```

## Example: Complete Product Detail Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import { VariantSelector } from '@/components/ecommerce/variant-selector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product, ProductVariant } from '@/lib/types';

interface ProductDetailPageProps {
  productId: string;
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // Fetch product with variants from public API
    fetch(`/api/public/products/${productId}`)
      .then(r => r.json())
      .then(data => {
        setProduct(data);
        if (data.variants?.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      });
  }, [productId]);

  if (!product) return <div>Loading...</div>;
  if (!selectedVariant) return <div>No variants available</div>;

  const handleAddToCart = () => {
    // Cart now stores variantId instead of productId as primary key
    addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      quantity,
      name: product.name,
      price: selectedVariant.price,
      sku: selectedVariant.sku,
      variantLabel: selectedVariant.variant_label,
      image: product.images[0]
    });
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Image */}
      <div>
        <img src={product.images[0]} alt={product.name} className="w-full" />
      </div>

      {/* Right: Details */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground mt-2">{product.description}</p>
        </div>

        {/* Variant Selector */}
        {product.variants && product.variants.length > 1 && (
          <VariantSelector
            variants={product.variants}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
          />
        )}

        {/* Price & Stock */}
        <div className="space-y-2">
          <div className="text-3xl font-bold">
            ₱{selectedVariant.price.toFixed(2)}
          </div>
          {selectedVariant.stock === 0 ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : (
            <Badge variant="secondary">{selectedVariant.stock} in stock</Badge>
          )}
        </div>

        {/* Quantity & Add to Cart */}
        <div className="flex gap-4">
          <input
            type="number"
            min="1"
            max={selectedVariant.stock}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-20 border rounded px-2 py-1"
          />
          <Button
            onClick={handleAddToCart}
            disabled={selectedVariant.stock === 0}
            className="flex-1"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## Testing Checklist

- [ ] Product page displays variants dropdown
- [ ] Price updates when variant is selected
- [ ] Stock status updates with variant selection
- [ ] Cart stores variantId instead of productId
- [ ] Cart items display variant label (e.g., "1kg")
- [ ] Checkout shows variant SKU for fulfillment
- [ ] Search still works (searches product name, not variants)
- [ ] Price ranges display correctly on product lists
- [ ] Out-of-stock variants are disabled in selector
- [ ] Mobile responsive variant selector

---

For more details, see `docs/PRODUCT_VARIANTS.md`
