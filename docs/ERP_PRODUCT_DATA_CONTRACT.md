# ERP Product Data Contract

**Date:** 2025-01-27  
**Purpose:** Complete list of field names required for product data upload from ERP to e-commerce system

---

## Required Fields for Product Upload

### Products Table Fields

| Field Name (Our System) | ERP Field Name (Your System) | Data Type | Required | Notes |
|-------------------------|------------------------------|-----------|----------|-------|
| `name` | `prod_name` or `product_name` | TEXT (string) | ✅ **REQUIRED** | Product name displayed on website |
| `sku` | `sku_external_id` | TEXT (string) | ✅ **REQUIRED** | Must be unique. Preserve leading zeros (e.g., "000005011200217250") |
| `description` | `prod_description` or `description` | TEXT (string) | ⚠️ Optional | Product description (can be empty) |
| `category` | `category` or `prod_category` | TEXT (string) | ⚠️ Optional | Product category (e.g., "Meat", "Dairy", "Frozen goods") |
| `image_url` | `image_url` or `prod_image` | TEXT (string) | ⚠️ Optional | Full URL to product image (can be null) |
| `price` | `price_per_item` | NUMERIC (number) | ⚠️ Optional* | Unit price (4 decimal precision supported) |
| `stock` | `stock` or `quantity` | INTEGER (number) | ⚠️ Optional* | Current inventory level (not invoice quantity) |
| `reorder_threshold` | `reorder_threshold` | INTEGER (number) | ⚠️ Optional | Low stock alert threshold (default: 5) |
| `is_active` | `is_active` | BOOLEAN (true/false) | ⚠️ Optional | Product active status (default: true) |

**Note:** Fields marked with * are optional at product level if using variants (see below).

---

### Product Variants Table Fields (If Using Variants)

**If your ERP has product variants (different sizes, weights, formats), provide these fields:**

| Field Name (Our System) | ERP Field Name (Your System) | Data Type | Required | Notes |
|-------------------------|------------------------------|-----------|----------|-------|
| `sku` | `sku_external_id` | TEXT (string) | ✅ **REQUIRED** | Unique SKU per variant (must be unique across all variants) |
| `variant_label` | `variant_label` or `uom` or `unit` | TEXT (string) | ✅ **REQUIRED** | Variant label (e.g., "1kg", "5kg", "PCK", "TIN", "SET") |
| `price` | `price_per_item` | NUMERIC (number) | ✅ **REQUIRED** | Price for this specific variant (4 decimal precision) |
| `stock` | `stock` or `quantity` | INTEGER (number) | ✅ **REQUIRED** | Stock level for this variant |
| `reorder_threshold` | `reorder_threshold` | INTEGER (number) | ⚠️ Optional | Low stock threshold (default: 5) |
| `is_active` | `is_active` | BOOLEAN (true/false) | ⚠️ Optional | Variant active status (default: true) |

**Note:** If using variants, each product can have multiple variants. Each variant needs its own row with `sku`, `variant_label`, `price`, and `stock`.

---

## Field Mapping from Your ERP Payload

Based on your current JSON payload structure, here's how to map your fields:

### From Your Invoice Payload (`details[]` array):

| Your Field | Maps To Our Field | Notes |
|------------|-------------------|-------|
| `sku_external_id` | `sku` | ✅ Use as-is (preserve as string with leading zeros) |
| `price_per_item` | `price` | ✅ Use as-is (supports 4 decimal places) |
| `sku_uom` | `variant_label` | ⚠️ Only if using variants (e.g., "PCK", "PC", "TIN") |
| `quantity` | ❌ **DO NOT USE** | This is invoice quantity, not inventory stock |

### Missing Fields You Need to Provide:

| Our Required Field | What We Need | Example |
|-------------------|--------------|---------|
| `name` | Product name from your product master table | "Chicken Breast 1kg" |
| `description` | Product description | "Fresh chicken breast, vacuum sealed" |
| `category` | Product category | "Meat" |
| `image_url` | Product image URL | "https://example.com/images/chicken.jpg" |
| `stock` | Current inventory level | 150 (not invoice quantity) |

---

## Complete Field List (Simple Format)

**For Products (Base Product):**
```
name (REQUIRED)
sku (REQUIRED) - map from your sku_external_id
description (optional)
category (optional)
image_url (optional)
price (optional - if not using variants)
stock (optional - if not using variants)
reorder_threshold (optional, default: 5)
is_active (optional, default: true)
```

**For Variants (If Using Variants):**
```
sku (REQUIRED) - map from your sku_external_id
variant_label (REQUIRED) - map from your sku_uom or provide separately
price (REQUIRED) - map from your price_per_item
stock (REQUIRED) - current inventory, NOT invoice quantity
reorder_threshold (optional, default: 5)
is_active (optional, default: true)
```

---

## Data Type Requirements

| Field | Expected Format | Example |
|-------|----------------|---------|
| `name` | String (text) | "Chicken Breast 1kg" |
| `sku` | String (text, preserve leading zeros) | "000005011200217250" |
| `description` | String (text, can be empty) | "Fresh chicken breast" |
| `category` | String (text) | "Meat" |
| `image_url` | String (URL) | "https://example.com/image.jpg" |
| `price` | Number (decimal, 4 decimal places supported) | 91.8393 |
| `stock` | Integer (whole number) | 150 |
| `reorder_threshold` | Integer (whole number) | 5 |
| `is_active` | Boolean (true/false) | true |

---

## Important Notes

1. **SKU Format:** 
   - Must be unique across all products/variants
   - Preserve leading zeros (store as TEXT, not number)
   - Example: "000005011200217250" (not 5011200217250)

2. **Price Precision:**
   - We support 4 decimal places (e.g., 91.8393)
   - Your `price_per_item` can be used directly

3. **Stock vs Quantity:**
   - `stock` = Current available inventory
   - `quantity` from invoice = Items ordered (DO NOT use as stock)

4. **Variants:**
   - If product has variants, provide variant-level data
   - Each variant needs: `sku`, `variant_label`, `price`, `stock`
   - Variant `sku` must be unique

5. **Required Fields:**
   - Minimum required: `name`, `sku`
   - All other fields have defaults or are optional

---

## Example JSON Structure

### Simple Product (No Variants):
```json
{
  "name": "Chicken Breast 1kg",
  "sku": "000005011200217250",
  "description": "Fresh chicken breast, vacuum sealed",
  "category": "Meat",
  "image_url": "https://example.com/images/chicken.jpg",
  "price": 91.8393,
  "stock": 150,
  "reorder_threshold": 5,
  "is_active": true
}
```

### Product with Variants:
```json
{
  "name": "Chicken Breast",
  "description": "Fresh chicken breast",
  "category": "Meat",
  "image_url": "https://example.com/images/chicken.jpg",
  "variants": [
    {
      "sku": "000005011200217250",
      "variant_label": "PCK",
      "price": 91.8393,
      "stock": 150,
      "reorder_threshold": 5,
      "is_active": true
    },
    {
      "sku": "000005011200217251",
      "variant_label": "1kg",
      "price": 185.6786,
      "stock": 75,
      "reorder_threshold": 5,
      "is_active": true
    }
  ]
}
```

---

## Questions for Your IT Department

1. **Do you have a product master table?** (separate from invoice data)
   - If yes, can you extract: `name`, `description`, `category`, `image_url`?

2. **Do you track inventory stock levels?**
   - If yes, what field name stores current stock? (not invoice quantity)

3. **Do you use product variants?**
   - If yes, how are variants stored? (separate table or same table?)

4. **Field name mapping:**
   - What is your field name for product name? (`prod_name`? `product_name`?)
   - What is your field name for product description?
   - What is your field name for product category?

---

**END OF DATA CONTRACT**

