"use client";

import { useState, useEffect, useRef } from "react";
import { CATEGORY_TREE, MAIN_CATEGORIES } from "@/lib/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/**
 * Product Form Data Type
 * Matches the database schema for the products table
 */
export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  image_url: string;
  category: string; // Stores as "Main Category → Subcategory"
  stock: number;
  sku: string;
  reorder_threshold: number;
  is_active: boolean;
}

interface ProductFormProps {
  /** Initial data for editing existing products (optional) */
  initialData?: Partial<ProductFormData>;
  /** Callback when form is submitted with valid data */
  onSubmit: (data: ProductFormData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Show cancel button */
  showCancel?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Loading state (external) */
  isLoading?: boolean;
}

/**
 * ProductForm Component
 * 
 * A comprehensive form for creating/editing products with cascading category selection.
 * 
 * Features:
 * - Two-level cascading category dropdowns
 * - Full form validation
 * - Auto-generated SKU option
 * - Image URL validation
 * - Controlled components with React state
 * - TypeScript typed
 * - Accessible with proper labels
 * 
 * Category Format:
 * Categories are stored in the format: "Main Category → Subcategory"
 * Example: "Food & Pantry → Canned goods"
 * 
 * Usage:
 * ```tsx
 * <ProductForm
 *   onSubmit={async (data) => {
 *     await saveProduct(data);
 *   }}
 *   submitText="Create Product"
 * />
 * ```
 */
export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  showCancel = true,
  submitText = "Save Product",
  isLoading = false,
}: ProductFormProps) {
  // Parse initial category if provided (format: "Main → Sub")
  const parseCategory = (categoryString?: string) => {
    if (!categoryString) return { main: "", sub: "" };
    const parts = categoryString.split(" → ");
    return {
      main: parts[0] || "",
      sub: parts[1] || "",
    };
  };

  const initialCategory = parseCategory(initialData?.category);

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price || "",
    image_url: initialData?.image_url || "",
    category: initialData?.category || "",
    stock: initialData?.stock || 0,
    sku: initialData?.sku || "",
    reorder_threshold: initialData?.reorder_threshold || 5,
    is_active: initialData?.is_active ?? true,
  });

  // Category selection state
  const [mainCategory, setMainCategory] = useState<string>(initialCategory.main);
  const [subcategory, setSubcategory] = useState<string>(initialCategory.sub);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.image_url || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData | "mainCategory" | "subcategory" | "imageFile", string>>>({});

  // Available subcategories based on selected main category
  const availableSubcategories = mainCategory ? CATEGORY_TREE[mainCategory] || [] : [];

  // Update category field when main/sub selection changes
  useEffect(() => {
    if (mainCategory && subcategory) {
      setFormData((prev) => ({
        ...prev,
        category: `${mainCategory} → ${subcategory}`,
      }));
      // Clear category errors when both are selected
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.mainCategory;
        delete newErrors.subcategory;
        delete newErrors.category;
        return newErrors;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        category: "",
      }));
    }
  }, [mainCategory, subcategory]);

  // Handle main category change
  const handleMainCategoryChange = (value: string) => {
    setMainCategory(value);
    setSubcategory(""); // Reset subcategory when main category changes
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));

    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof errors];
        return newErrors;
      });
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Image upload functions
  const validateImageFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image';
    }

    if (file.size > maxSize) {
      return 'Image size must be less than 5MB';
    }

    return null;
  };

  const handleImageSelect = (file: File) => {
    const error = validateImageFile(file);
    if (error) {
      setErrors((prev) => ({ ...prev, imageFile: error }));
      return;
    }

    setImageFile(file);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.imageFile;
      delete newErrors.image_url;
      return newErrors;
    });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImageToSupabase = async (): Promise<string | null> => {
    if (!imageFile) return formData.image_url || null;

    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      setUploadProgress(100);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Image upload error:', error);
      setErrors((prev) => ({ 
        ...prev, 
        imageFile: error.message || 'Failed to upload image. Please try again.' 
      }));
      return null;
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  // Generate random SKU
  const generateSKU = () => {
    const prefix = mainCategory
      ? mainCategory.split(" ")[0].toUpperCase().substring(0, 4)
      : "PROD";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newSKU = `${prefix}-${random}`;
    setFormData((prev) => ({ ...prev, sku: newSKU }));
    if (errors.sku) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.sku;
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData | "mainCategory" | "subcategory", string>> = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "Valid price is required";
    }
    if (!mainCategory) newErrors.mainCategory = "Main category is required";
    if (!subcategory) newErrors.subcategory = "Subcategory is required";
    if (!formData.sku.trim()) newErrors.sku = "SKU is required";
    if (formData.stock < 0) newErrors.stock = "Stock cannot be negative";
    if (formData.reorder_threshold < 0) {
      newErrors.reorder_threshold = "Reorder threshold cannot be negative";
    }

    // URL validation (optional field)
    if (formData.image_url && !isValidUrl(formData.image_url)) {
      newErrors.image_url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Simple URL validation
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Upload image if a new file was selected
    if (imageFile) {
      const imageUrl = await uploadImageToSupabase();
      if (!imageUrl) {
        // Upload failed, error already set
        return;
      }
      formData.image_url = imageUrl;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Product Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Premium Coffee Beans 500g"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your product in detail..."
          rows={4}
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price" className="text-sm font-medium">
          Price (₱) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={handleInputChange}
          placeholder="0.00"
          className={errors.price ? "border-destructive" : ""}
        />
        {errors.price && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.price}
          </p>
        )}
      </div>

      {/* Cascading Category Selection */}
      <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold">Category Selection</h3>
          <span className="text-destructive">*</span>
        </div>

        {/* Main Category Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="mainCategory" className="text-sm font-medium">
            Main Category
          </Label>
          <select
            id="mainCategory"
            value={mainCategory}
            onChange={(e) => handleMainCategoryChange(e.target.value)}
            className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.mainCategory ? "border-destructive" : "border-border"
            }`}
          >
            <option value="">-- Select Main Category --</option>
            {MAIN_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.mainCategory && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.mainCategory}
            </p>
          )}
        </div>

        {/* Subcategory Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="subcategory" className="text-sm font-medium">
            Subcategory
          </Label>
          <select
            id="subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!mainCategory || availableSubcategories.length === 0}
            className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.subcategory ? "border-destructive" : "border-border"
            }`}
          >
            <option value="">
              {mainCategory
                ? "-- Select Subcategory --"
                : "-- Select Main Category First --"}
            </option>
            {availableSubcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
          {errors.subcategory && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.subcategory}
            </p>
          )}
        </div>

        {/* Selected Category Display */}
        {formData.category && (
          <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm font-medium text-primary">
              Selected Category: <span className="font-bold">{formData.category}</span>
            </p>
          </div>
        )}
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Product Image
        </Label>
        
        {imagePreview ? (
          /* Image Preview */
          <div className="relative border-2 border-border rounded-lg p-4 bg-muted/30">
            <div className="relative w-full h-64 mb-3">
              <img
                src={imagePreview}
                alt="Product preview"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {imageFile ? `${imageFile.name} (${(imageFile.size / 1024).toFixed(1)} KB)` : 'Current image'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeImage}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          /* Upload Zone */
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            } ${errors.imageFile ? 'border-destructive' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                {isUploadingImage ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium">
                {isUploadingImage ? 'Uploading...' : 'Drop image here or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG or WebP (max 5MB)
              </p>
            </label>
          </div>
        )}

        {errors.imageFile && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.imageFile}
          </p>
        )}

        {isUploadingImage && uploadProgress > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Optional: Upload a product image or leave blank
        </p>
      </div>

      {/* SKU */}
      <div className="space-y-2">
        <Label htmlFor="sku" className="text-sm font-medium">
          SKU (Stock Keeping Unit) <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="sku"
            name="sku"
            value={formData.sku}
            onChange={handleInputChange}
            placeholder="e.g., FOOD-ABC123"
            className={errors.sku ? "border-destructive flex-1" : "flex-1"}
          />
          <Button type="button" variant="outline" onClick={generateSKU}>
            Generate
          </Button>
        </div>
        {errors.sku && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.sku}
          </p>
        )}
      </div>

      {/* Stock & Reorder Threshold */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stock */}
        <div className="space-y-2">
          <Label htmlFor="stock" className="text-sm font-medium">
            Stock Quantity
          </Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={handleInputChange}
            className={errors.stock ? "border-destructive" : ""}
          />
          {errors.stock && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.stock}
            </p>
          )}
        </div>

        {/* Reorder Threshold */}
        <div className="space-y-2">
          <Label htmlFor="reorder_threshold" className="text-sm font-medium">
            Reorder Threshold
          </Label>
          <Input
            id="reorder_threshold"
            name="reorder_threshold"
            type="number"
            min="0"
            value={formData.reorder_threshold}
            onChange={handleInputChange}
            className={errors.reorder_threshold ? "border-destructive" : ""}
          />
          {errors.reorder_threshold && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.reorder_threshold}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Alert when stock falls below this number
          </p>
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleCheckboxChange}
          className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
        />
        <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
          Product is active and visible to customers
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        {showCancel && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading || isUploadingImage}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || isUploadingImage} className="min-w-[120px]">
          {isUploadingImage ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            submitText
          )}
        </Button>
      </div>
    </form>
  );
}
