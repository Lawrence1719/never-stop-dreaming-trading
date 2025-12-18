# Product Variants Refactor - Implementation Guide

## Overview
This document describes the refactoring of the product system to support relational product variants, enabling proper inventory tracking and future IoT integration for a grocery e-commerce platform.

## Architecture

### Database (Relational Model)
The system uses a true parent-child relational structure for products and variants:

```
products (base information only)
├── id (UUID)
├── name
├── description
├── category
├── image_url
├── is_active
├── created_at
└── updated_at

product_variants (inventory & pricing per variant)
├── id (UUID)
├── product_id (FK → products.id, CASCADE ON DELETE)
├── variant_label (e.g., "1kg", "5kg", "150g")
├── price
├── stock
├── sku (UNIQUE)
├── reorder_threshold
├── is_active
├── created_at
└── updated_at
```

**Key Benefits:**
- ✅ Normalized database structure
- ✅ SKU uniqueness at variant level (not product level)
- ✅ Per-variant inventory tracking
- ✅ IoT-friendly (inventory updates target variant.id, not product.id)
- ✅ Scalable and future-proof

### API Response Format (Nested JSON)
Frontend receives flattened data for convenience:

```json
{
  "id": "prod-123",
  "name": "Basmati Rice",
  "category": "Rice & grains",
  "price": 250,
  "stock": 150,
  "variants": [
    {
      "id": "var-1",
      "variant_label": "1kg",
      "price": 250,
      "stock": 50,
      "sku": "RICE-1KG-001"
    },
    {
      "id": "var-2",
      "variant_label": "5kg",
      "price": 1100,
      "stock": 100,
      "sku": "RICE-5KG-001"
    }
  ],
  "totalStock": 150,
  "minPrice": 250,
  "maxPrice": 1100
}
```

## Deliverables

### 1. Database Migration
**File:** `supabase/migrations/018_create_product_variants_table.sql`

Creates the `product_variants` table with:
- Foreign key reference to products (cascade on delete)
- Unique SKU constraint
- Indexes on product_id and sku for query performance
- Updated_at trigger for auditing
- RLS policies for public/admin access

### 2. Type Definitions
**File:** `lib/types/index.ts`

**New types:**
- `ProductVariant` - Represents individual product variant
- Updated `Product` - Removed price/stock/sku, added variants array and computed fields
- Updated `CartItem` - Added variantId, sku, variantLabel
- Updated `OrderItem` - Added variantId as primary identifier

### 3. API Endpoints

#### Admin Endpoints
- **POST /api/admin/products** - Create product (base info only)
- **GET /api/admin/products** - List products with variants count and total stock
- **POST /api/admin/products/variants** - Create variant
- **GET /api/admin/products/variants?product_id=xxx** - List variants for a product
- **PUT /api/admin/products/variants/[id]** - Update variant
- **DELETE /api/admin/products/variants/[id]** - Soft delete variant

#### Public Endpoint
- **GET /api/public/products** - Returns active products with active variants, includes computed fields

### 4. Admin UI Components

#### ProductVariantForm (`components/admin/product-variant-form.tsx`)
Comprehensive form for creating/editing variants with:
- Variant label input (e.g., "1kg", "5kg")
- SKU input (unique validation)
- Price input
- Stock input
- Reorder threshold
- Active/inactive toggle
- Full form validation and error handling

#### ManageVariantsPage (`components/admin/manage-variants-page.tsx`)
Admin page for managing all variants of a product:
- Displays product details
- Table showing all variants with full info
- Create new variant button with dialog
- Edit variant functionality
- Delete variant with confirmation
- Toggle variant active/inactive status
- Shows stock levels with color-coded badges

#### Updated CreateProductPage (`app/admin/products/new/page.tsx`)
Simplified product creation:
- Removed price, stock, SKU fields
- Only collects: name, description, category, image
- Redirects to ManageVariantsPage after creation
- Updated UI with "Next Steps" guidance

#### Updated ProductsList (`app/admin/products/page.tsx`)
Admin product listing with new columns:
- Variants count (badge)
- Total stock (sum of all variant stocks)
- Price range (min - max)
- "Manage Variants" action in dropdown menu

### 5. Customer-Facing Components

#### VariantSelector (`components/ecommerce/variant-selector.tsx`)
Dropdown selector for customers to choose variants:
- Shows variant label, price, and stock availability
- Automatically selects first variant if only one exists
- Disabled state for out-of-stock variants
- Color-coded badges for stock status

### 6. File Structure
```
supabase/migrations/
├── 018_create_product_variants_table.sql

components/admin/
├── product-variant-form.tsx (NEW)
├── manage-variants-page.tsx (NEW)
└── product-form.tsx (existing, unchanged)

components/ecommerce/
├── variant-selector.tsx (NEW)
└── ... (existing components)

app/api/admin/products/
├── route.ts (UPDATED - no SKU/price/stock in body)
├── variants/
│   ├── route.ts (NEW - POST/GET for variants)
│   └── [id]/
│       └── route.ts (NEW - PUT/DELETE for variant)

app/api/public/products/
└── route.ts (UPDATED - includes variants in response)

app/admin/products/
├── new/page.tsx (UPDATED - simplified product creation)
├── page.tsx (UPDATED - new columns, Manage Variants action)
└── [id]/
    └── variants/
        └── page.tsx (NEW - variant management page)

lib/types/
└── index.ts (UPDATED - ProductVariant type, updated Product type)
```

## Migration Path (For Existing Data)

If you have existing products with price/stock/sku in the products table:

1. **Run the migration** to create `product_variants` table
2. **Optional: Create a backfill function** to convert existing products to variants:
   ```sql
   -- For each existing product, create one variant
   INSERT INTO product_variants (product_id, variant_label, price, stock, sku, reorder_threshold)
   SELECT id, 'Standard', price, stock, sku, reorder_threshold FROM products;
   ```
3. **Remove old columns from products** (in separate migration after backfill)
4. **Update frontend code** to fetch and display variants

## Workflow for Users

### Admin: Creating a New Product
1. Click "Add Product" → Create Product page
2. Fill in name, description, category, image
3. Click "Create Product"
4. Redirected to "Manage Variants" page
5. Click "Add Variant"
6. Fill in: label (e.g., "1kg"), price, stock, SKU, reorder threshold
7. Click "Create Variant"
8. Repeat for additional sizes/formats
9. Product is now complete with pricing and inventory

### Customer: Buying a Product
1. Browse products on `/products` page
2. Click product card to view details
3. Use VariantSelector to choose size (e.g., "1kg" vs "5kg")
4. Price and stock update based on selected variant
5. Add to cart (stores variantId, not productId)

### Admin: Managing Inventory
1. Go to Admin Products page
2. See "Variants" count and "Total Stock" per product
3. Click "Manage Variants" to update:
   - Individual variant pricing
   - Stock levels
   - Reorder thresholds
   - Active/inactive status

## IoT Integration Ready

The system is designed to support IoT sensors that automatically update inventory:

**Before (not scalable):**
```
Sensor updates: products.stock = 50
```

**After (scalable):**
```
Sensor updates: product_variants.id = "var-123", stock = 50
```

This allows:
- Multiple sensors per product (one per variant/location)
- Precise inventory tracking at variant level
- Clear mapping of SKU to variant for barcode scanning

## Database Queries

### Get product with all variants
```sql
SELECT p.*, json_agg(pv.*) as variants
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
WHERE p.id = 'product-123'
GROUP BY p.id;
```

### Get product with only active variants
```sql
SELECT p.*, json_agg(pv.*) as variants
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
WHERE p.id = 'product-123' AND p.is_active = true
GROUP BY p.id;
```

### Get low stock variants
```sql
SELECT pv.*, p.name
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.stock <= pv.reorder_threshold AND pv.is_active = true;
```

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Can create product without price/stock
- [ ] Product redirects to Manage Variants
- [ ] Can add/edit/delete variants
- [ ] SKU uniqueness is enforced
- [ ] Admin sees correct variant count and total stock
- [ ] Public API returns variants in products
- [ ] Customer can select variants in dropdown
- [ ] Cart stores variantId (not productId)
- [ ] Orders track variant information

## Future Enhancements

1. **Bulk Variant Upload** - CSV upload for quick variant creation
2. **Variant Attributes** - Size matrix (M, L, XL) + Color (Red, Blue)
3. **Inventory Sync** - Real-time IoT sensor updates
4. **Low Stock Alerts** - Email/SMS when stock < threshold
5. **Variant Analytics** - Track sales per variant
6. **Bundle Variants** - Create product bundles with multiple variants

## Notes

- **No duplicate rows** - Each variant is a single row in product_variants
- **Clean separation** - UI receives nested JSON, but DB remains normalized
- **Soft deletes** - Set `is_active = false` instead of hard DELETE
- **RLS policies** - Customers see only active products and variants
- **SKU is unique** - Prevents accidental duplicate inventory entries

## Support

For questions or issues, refer to:
- `docs/PRODUCTS.md` - Product schema documentation
- `docs/ORDER_ITEMS.md` - Order item handling
- `components/admin/product-variant-form.tsx` - Component usage examples
