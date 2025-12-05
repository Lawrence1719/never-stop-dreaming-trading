# Product Form Component Documentation

## Overview

A production-ready React component for creating and editing products with **cascading category selection**. The component features two-level category dropdowns that store data in the format `"Main Category → Subcategory"`.

## Files Created

1. **`components/admin/product-form.tsx`** - Main form component
2. **`components/admin/product-form-example.tsx`** - Usage examples and integration patterns

## Features

✅ **Cascading Category Dropdowns**
- Two-level category selection (Main → Subcategory)
- Dynamic subcategory filtering based on main category selection
- Automatic category string formatting
- Visual feedback for selected category path

✅ **Form Validation**
- Required field validation
- Price validation (must be positive)
- URL validation for image URLs
- Stock quantity validation
- Real-time error display

✅ **User Experience**
- Disabled subcategory until main category is selected
- Auto-reset subcategory when main category changes
- Clear visual hierarchy with grouped sections
- Accessible with proper labels and ARIA attributes

✅ **Developer Experience**
- TypeScript typed
- Controlled components
- Customizable callbacks
- Loading states
- Easy integration with Supabase
- Comprehensive documentation

## Quick Start

### Basic Usage (Create New Product)

```tsx
import { ProductForm } from "@/components/admin/product-form";
import { supabase } from "@/lib/supabase/client";

function CreateProduct() {
  const handleSubmit = async (data) => {
    const { error } = await supabase.from("products").insert([{
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      image_url: data.image_url || null,
      category: data.category, // "Food & Pantry → Canned goods"
      stock: data.stock,
      sku: data.sku,
      reorder_threshold: data.reorder_threshold,
      is_active: data.is_active,
    }]);

    if (error) {
      console.error("Error:", error);
      return;
    }

    console.log("Product created!");
  };

  return (
    <ProductForm
      onSubmit={handleSubmit}
      submitText="Create Product"
    />
  );
}
```

### Edit Existing Product

```tsx
function EditProduct({ productId }) {
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    // Fetch product data
    const fetchProduct = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      setInitialData({
        name: data.name,
        description: data.description,
        price: data.price.toString(),
        category: data.category, // Component will parse "Main → Sub"
        stock: data.stock,
        // ... other fields
      });
    };
    fetchProduct();
  }, [productId]);

  const handleUpdate = async (data) => {
    await supabase
      .from("products")
      .update(data)
      .eq("id", productId);
  };

  if (!initialData) return <div>Loading...</div>;

  return (
    <ProductForm
      initialData={initialData}
      onSubmit={handleUpdate}
      submitText="Update Product"
    />
  );
}
```

## Component Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onSubmit` | `(data: ProductFormData) => Promise<void>` | Yes | - | Callback when form is submitted with valid data |
| `initialData` | `Partial<ProductFormData>` | No | `undefined` | Initial data for editing existing products |
| `onCancel` | `() => void` | No | `undefined` | Callback when cancel button is clicked |
| `showCancel` | `boolean` | No | `true` | Whether to show the cancel button |
| `submitText` | `string` | No | `"Save Product"` | Text for the submit button |
| `isLoading` | `boolean` | No | `false` | External loading state |

## ProductFormData Type

```typescript
interface ProductFormData {
  name: string;              // Product name
  description: string;       // Product description
  price: string;            // Price as string (converted to number on submit)
  image_url: string;        // Optional image URL
  category: string;         // "Main Category → Subcategory"
  stock: number;            // Stock quantity
  sku: string;              // Stock Keeping Unit
  reorder_threshold: number; // Low stock alert threshold
  is_active: boolean;       // Product visibility status
}
```

## Category Format

Categories are stored in the database as a single string with the format:
```
"Main Category → Subcategory"
```

### Examples:
- `"Food & Pantry → Canned goods"`
- `"Beverages → Water"`
- `"Personal Care → Shampoo & conditioners"`

### Available Categories

**Main Categories:**
- Food & Pantry
- Beverages
- Household Essentials
- Personal Care
- Refrigerated & Frozen

**Subcategories:**
- **Food & Pantry:** Canned goods, Noodles & pasta, Rice & grains, Condiments & sauces, Cooking ingredients, Snacks & biscuits
- **Beverages:** Water, Soft drinks, Juices, Coffee & tea, Energy drinks
- **Household Essentials:** Cleaning supplies, Laundry detergents, Dishwashing liquid, Trash bags, Tissue & paper products
- **Personal Care:** Shampoo & conditioners, Soap & body wash, Toothpaste, Deodorant, Sanitary products
- **Refrigerated & Frozen:** Meat, Frozen goods, Dairy, Ice cream, Cold beverages

### Modifying Categories

To add or modify categories, edit `lib/data/categories.ts`:

```typescript
export const CATEGORY_TREE: Record<string, string[]> = {
  'Food & Pantry': [
    'Canned goods',
    'Your New Subcategory', // Add here
  ],
  'Your New Main Category': [ // Add new main category
    'Subcategory 1',
    'Subcategory 2',
  ],
};
```

## Working with Categories

### Extracting Category Parts

```typescript
function extractCategoryParts(categoryString: string) {
  const parts = categoryString.split(" → ");
  return {
    mainCategory: parts[0] || "",
    subcategory: parts[1] || "",
  };
}

// Usage
const { mainCategory, subcategory } = extractCategoryParts("Food & Pantry → Canned goods");
// mainCategory: "Food & Pantry"
// subcategory: "Canned goods"
```

### Filtering Products by Main Category

```typescript
const { data } = await supabase
  .from("products")
  .select("*")
  .like("category", `Food & Pantry →%`); // Gets all Food & Pantry products
```

### Filtering Products by Exact Category

```typescript
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("category", "Food & Pantry → Canned goods");
```

## Form Features

### Auto-Generated SKU

Click the "Generate" button next to the SKU field to automatically create a SKU based on the selected main category:

```
Food & Pantry → Canned goods  →  FOOD-A3K9X2
Beverages → Water             →  BEVE-B7M1P5
```

### Validation Rules

1. **Required Fields:**
   - Product Name
   - Description
   - Price (must be > 0)
   - Main Category
   - Subcategory
   - SKU

2. **Optional Fields:**
   - Image URL (validated if provided)

3. **Number Validation:**
   - Stock: Cannot be negative
   - Reorder Threshold: Cannot be negative
   - Price: Must be positive

### Error Display

Errors appear below each field with a red alert icon:
```
⚠️ Product name is required
⚠️ Valid price is required
⚠️ Please enter a valid URL
```

## Styling

The component uses:
- **Tailwind CSS** for styling
- **shadcn/ui** components (Button, Input, Label, Textarea)
- **lucide-react** icons

### Customizing Styles

The component uses standard Tailwind classes. You can customize:

```tsx
// Example: Change primary color scheme
className="border-primary bg-primary/10" // Uses your theme's primary color

// Example: Adjust spacing
className="space-y-6" // Change to space-y-4 or space-y-8
```

## Integration Examples

See `components/admin/product-form-example.tsx` for complete examples:

1. **Creating a New Product** - Basic creation flow
2. **Editing an Existing Product** - Loading and updating data
3. **Modal/Dialog Usage** - Using the form in a modal
4. **Category Filtering** - Querying products by category

## Database Schema

The component is designed for this products table schema:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  sku TEXT NOT NULL UNIQUE,
  reorder_threshold INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Accessibility

- All form fields have associated `<label>` elements
- Required fields marked with asterisk (*)
- Error messages linked to inputs
- Keyboard navigation support
- Disabled states for dependent fields
- Focus management

## Troubleshooting

### Category not displaying after edit

Make sure the category in your database is in the correct format:
```
"Food & Pantry → Canned goods"  ✅ Correct
"Food & Pantry - Canned goods"  ❌ Wrong separator
"Canned goods"                  ❌ Missing main category
```

### Subcategory dropdown stays disabled

Ensure you've selected a main category first. The component automatically enables the subcategory dropdown when a main category is chosen.

### SKU not generating

The SKU generator uses the main category to create a prefix. Select a main category before clicking "Generate".

## Best Practices

1. **Always validate on the backend** - This form provides client-side validation, but always validate server-side too
2. **Handle loading states** - Pass `isLoading` prop to prevent duplicate submissions
3. **Show success/error messages** - Use toast notifications to confirm actions
4. **Sanitize inputs** - Especially for description and image_url fields
5. **Use TypeScript** - The component is fully typed for better DX

## Support

For issues or questions:
1. Check the examples in `product-form-example.tsx`
2. Review the inline JSDoc comments in `product-form.tsx`
3. Verify your database schema matches the expected format
4. Ensure categories.ts is properly configured

## License

MIT - Feel free to use and modify for your project.
