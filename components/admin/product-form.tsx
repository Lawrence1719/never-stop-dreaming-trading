"use client";

import { useState, useEffect, useRef } from "react";
// Removed: import { MAIN_CATEGORIES } from "@/lib/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Loader2, Upload, X, Image as ImageIcon, ArrowRight, Info, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/**
 * Product Form Data Type
 * Matches the database schema for the products table
 */
export interface ProductFormData {
  name: string;
  description: string;
  image_url: string; // Legacy/Main preview
  product_images: {
    id?: string;
    storage_path: string;
    is_primary: boolean;
    sort_order: number;
    file?: File; // Temporary for new uploads
    preview?: string; // Temporary for UI
  }[];
  category: string;
  is_active: boolean;
  // Added fields for quick setup
  price: number;
  stock: number;
  sku: string;
  // Supplier / legacy FoxPro fields
  supplier_id: string | null;
  item_code: string;
  unit: string;
  doz_pckg: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { id?: string; product_images?: any[] };
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  submitText?: string;
  isLoading?: boolean;
  variantCount?: number;
  onSwitchToVariants?: () => void;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  showCancel = true,
  submitText = "Save Product",
  isLoading = false,
  variantCount = 0,
  onSwitchToVariants,
}: ProductFormProps) {
  // Use the category directly
  const initialCategory = initialData?.category || "";

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    image_url: initialData?.image_url || "",
    product_images: (initialData?.product_images || []).map((img, idx) => ({
      ...img,
      sort_order: img.sort_order ?? idx
    })),
    category: initialData?.category || "",
    is_active: initialData?.is_active ?? true,
    price: initialData?.price ?? 0,
    stock: initialData?.stock ?? 0,
    sku: initialData?.sku || "",
    supplier_id: (initialData as any)?.supplier_id ?? null,
    item_code: (initialData as any)?.item_code ?? "",
    unit: (initialData as any)?.unit ?? "",
    doz_pckg: (initialData as any)?.doz_pckg ?? "",
  });

  // Categories from DB
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Suppliers from DB
  const [dbSuppliers, setDbSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Category selection state
  const [mainCategory, setMainCategory] = useState<string>(initialCategory);

  // Image upload & gallery state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SKU Generation State
  const [skuMode, setSkuMode] = useState<'auto' | 'manual'>(initialData?.sku ? 'manual' : 'auto');
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData | "mainCategory" | "imageFile", string>>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch categories from DB
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/admin/categories', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        const result = await res.json();
        if (res.ok) {
          // Only show active categories
          setDbCategories((result.data || []).filter((cat: any) => cat.is_active));
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch suppliers from DB
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoadingSuppliers(true);
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/admin/suppliers', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const result = await res.json();
        if (res.ok) setDbSuppliers(result.data || []);
      } catch (err) {
        console.error('Failed to fetch suppliers:', err);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Update category field when main selection changes
  useEffect(() => {
    if (mainCategory) {
      setFormData((prev) => ({
        ...prev,
        category: mainCategory,
      }));
      
      // Clear category errors
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.mainCategory;
        delete newErrors.category;
        return newErrors;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        category: "",
      }));
    }
  }, [mainCategory]);

  // SKU Generation Utilities
  const getCategoryCode = (catName: string) => {
    const mapping: Record<string, string> = {
      'Food & Pantry': 'FP',
      'Household Essentials': 'HE',
      'Beverages': 'BV',
      'Personal Care': 'PC',
      'Fresh Produce': 'FR',
      'Dairy': 'DY',
      'Snacks': 'SN'
    };
    return mapping[catName] || catName.substring(0, 2).toUpperCase();
  };

  const getAbbreviation = (name: string) => {
    const skipWords = ['the', 'a', 'an', 'of', 'and'];
    const words = name.toLowerCase().split(/\s+/).filter(w => !skipWords.includes(w) && w.length > 0);
    let abbr = '';
    for (const word of words) {
      abbr += word.substring(0, Math.min(3, 6 - abbr.length));
      if (abbr.length >= 6) break;
    }
    return abbr.toUpperCase();
  };

  // Debounced SKU Generation
  useEffect(() => {
    if (skuMode === 'manual' || !formData.name || !mainCategory) return;

    const timer = setTimeout(async () => {
      setIsGeneratingSku(true);
      try {
        const catCode = getCategoryCode(mainCategory);
        const nameAbbr = getAbbreviation(formData.name);
        const prefix = `${catCode}-${nameAbbr}`;
        
        const res = await fetch(`/api/admin/products/next-sku?prefix=${prefix}`);
        const result = await res.json();
        if (res.ok) {
          setFormData(prev => ({ ...prev, sku: `${prefix}-${result.data.sequence}` }));
          setSkuError(null);
        }
      } catch (err) {
        console.error('Failed to auto-generate SKU:', err);
      } finally {
        setIsGeneratingSku(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name, mainCategory, skuMode]);

  // Handle main category change
  const handleMainCategoryChange = (value: string) => {
    setMainCategory(value);
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : (name === 'sku' ? value.toUpperCase() : value),
    }));

    // Handle manual SKU edit
    if (name === 'sku' && skuMode === 'auto') {
      setSkuMode('manual');
    }

    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof errors];
        return newErrors;
      });
    }
    
    if (name === 'sku') setSkuError(null);
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
      return `File ${file.name} is not a valid image. Please upload JPEG, PNG, or WebP.`;
    }

    if (file.size > maxSize) {
      return `File ${file.name} is too large (max 5MB).`;
    }

    return null;
  };

  const handleImagesSelect = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    let errorMessage = null;

    for (const file of newFiles) {
      const error = validateImageFile(file);
      if (error) {
        errorMessage = error;
        break;
      }
      validFiles.push(file);
    }

    if (errorMessage) {
      setErrors((prev) => ({ ...prev, imageFile: errorMessage || "" }));
      return;
    }

    const imagesToAdd = validFiles.map((file, idx) => ({
      storage_path: "", // Will be filled after upload
      is_primary: formData.product_images.length === 0 && idx === 0, // First image added becomes primary
      sort_order: formData.product_images.length + idx,
      file,
      preview: URL.createObjectURL(file), // Create a temporary URL for preview
    }));

    setFormData((prev) => ({
      ...prev,
      product_images: [...prev.product_images, ...imagesToAdd],
    }));

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.imageFile;
      delete newErrors.image_url; // Clear legacy image_url error if images are being added
      return newErrors;
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImagesSelect(e.target.files);
      // Clear the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImagesSelect(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = prev.product_images.filter((_, i) => i !== index);
      // Ensure one remains primary if we removed the primary one
      if (prev.product_images[index]?.is_primary && newImages.length > 0) {
        newImages[0].is_primary = true;
      }
      return { ...prev, product_images: newImages };
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const setPrimaryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      product_images: prev.product_images.map((img, i) => ({
        ...img,
        is_primary: i === index,
      })),
    }));
  };

  const uploadImagesToSupabase = async (): Promise<any[]> => {
    const imagesToProcess = formData.product_images;
    const finalImages = [];
    const newFilesToUpload: File[] = [];
    const existingImages: any[] = [];
    
    // Separate new files from existing images
    imagesToProcess.forEach(img => {
      if (img.file) newFilesToUpload.push(img.file);
      else existingImages.push(img);
    });

    if (newFilesToUpload.length === 0) return existingImages;

    setIsUploadingImage(true);
    setUploadProgress(10);

    try {
      const formDataUpload = new FormData();
      newFilesToUpload.forEach(file => formDataUpload.append('files', file));

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/admin/products/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: formDataUpload
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { paths } = await res.json();
      
      // Combine results
      let newFileIndex = 0;
      for (let i = 0; i < imagesToProcess.length; i++) {
        const img = imagesToProcess[i];
        if (img.file) {
          finalImages.push({
            storage_path: paths[newFileIndex++],
            is_primary: img.is_primary,
            sort_order: i
          });
        } else {
          finalImages.push({
            ...img,
            sort_order: i
          });
        }
      }

      return finalImages;
    } catch (error: any) {
      console.error('Image upload error:', error);
      setErrors(prev => ({ ...prev, imageFile: error.message }));
      return [];
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  // Generate random SKU - Removed as SKU is now at variant level

  // Validate form
  const validateForm = (): Partial<Record<keyof ProductFormData | "mainCategory", string>> | null => {
    const newErrors: Partial<Record<keyof ProductFormData | "mainCategory", string>> = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!mainCategory) newErrors.mainCategory = "Category is required";

    // URL validation (optional field)
    if (formData.image_url && !isValidUrl(formData.image_url)) {
      newErrors.image_url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 ? null : newErrors;
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
    console.log("Submitting product form...", formData);
    setIsSuccess(false);

    const validationErrors = validateForm();
    if (validationErrors) {
      console.warn("Validation failed:", validationErrors);
      return;
    }

    // Uniqueness check for SKU
    try {
      const res = await fetch(`/api/admin/variants/check-sku?sku=${formData.sku}&productId=${initialData?.id || ''}`);
      const result = await res.json();
      if (!res.ok || result.exists) {
        setSkuError("This SKU already exists. Please use a unique identifier.");
        return;
      }
    } catch (err) {
      console.error("SKU uniqueness check failed:", err);
    }

    try {
      // 1. Upload images if needed
      const finalImages = await uploadImagesToSupabase();
      
      // Update the main image_url for legacy compatibility (use primary)
      const primaryImg = finalImages.find(img => img.is_primary) || finalImages[0];
      const mainImageUrl = primaryImg ? primaryImg.storage_path : formData.image_url;

      const submissionData = {
        ...formData,
        image_url: mainImageUrl,
        product_images: finalImages
      };

      await onSubmit(submissionData);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      throw err;
    }
  };
  
  const isSimpleProduct = variantCount <= 1;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Left Column: Basic Details */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Information</h3>
              <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold text-primary uppercase">{isSimpleProduct ? 'Simple Product' : 'Variable Product'}</span>
              </div>
            </div>
            
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
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}
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
                rows={5}
                className={`min-h-[160px] resize-none ${errors.description ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}`}
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">Category</h3>
                <span className="text-destructive">*</span>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-2">
                <SearchableSelect
                  options={dbCategories.map((cat) => ({ value: cat.name, label: cat.name }))}
                  value={mainCategory}
                  onValueChange={handleMainCategoryChange}
                  placeholder={isLoadingCategories ? "Loading categories..." : "-- Select Category --"}
                  searchPlaceholder="Search category..."
                  triggerClassName={errors.mainCategory ? "border-destructive bg-background" : "bg-background"}
                  disabled={isLoadingCategories}
                />
                {errors.mainCategory && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.mainCategory}
                  </p>
                )}
              </div>

              {/* Selected Category Display */}
              {formData.category && (
                <div className="mt-3 p-2 bg-primary/5 border border-primary/10 rounded-md">
                  <p className="text-[11px] font-medium text-primary uppercase tracking-tight">
                    Current: <span className="font-bold underline">{formData.category}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Supplier Selection */}
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">Supplier / Principal</h3>
                <span className="text-muted-foreground text-xs">(optional)</span>
              </div>

              <SearchableSelect
                options={[
                  { value: '', label: '— None —' },
                  ...dbSuppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
                value={formData.supplier_id ?? ''}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, supplier_id: val || null }))
                }
                placeholder={isLoadingSuppliers ? 'Loading suppliers...' : '— Select Supplier —'}
                searchPlaceholder="Search supplier..."
                disabled={isLoadingSuppliers}
              />

              {/* Legacy metadata fields */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="item_code" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Item Code
                  </Label>
                  <Input
                    id="item_code"
                    name="item_code"
                    value={formData.item_code}
                    onChange={handleInputChange}
                    placeholder="e.g. 47886"
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unit" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Unit
                  </Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="e.g. PC"
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doz_pckg" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Doz/Pckg
                  </Label>
                  <Input
                    id="doz_pckg"
                    name="doz_pckg"
                    value={formData.doz_pckg}
                    onChange={handleInputChange}
                    placeholder="e.g. 48/CASE"
                    className="h-9 text-sm bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-muted/10 shadow-sm transition-all hover:bg-muted/20">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleCheckboxChange}
                className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
              />
              <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer flex-1">
                Product is active and visible to customers
              </Label>
            </div>
          </div>

          {/* Right Column: Media, Inventory & Pricing */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Gallery</h3>
              
              {/* Image Upload Gallery */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">
                  Manage Images ({formData.product_images.length}/10)
                </Label>
                
                {/* Gallery Grid */}
                {formData.product_images.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {formData.product_images.map((img, index) => {
                      const imageUrl = img.preview || (img.storage_path ? (
                        img.storage_path.startsWith('http') 
                          ? img.storage_path 
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`
                      ) : "/placeholder-image.jpg");

                      return (
                        <div 
                          key={index} 
                          className={`relative group aspect-square border-2 rounded-xl overflow-hidden bg-muted/30 transition-all ${
                            img.is_primary ? "border-primary shadow-md" : "border-border"
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          
                          {/* Actions Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 px-3">
                            {!img.is_primary && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="w-full text-[10px] h-8 font-bold"
                                onClick={() => setPrimaryImage(index)}
                              >
                                SET PRIMARY
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="w-full text-[10px] h-8 font-bold"
                              onClick={() => removeImage(index)}
                            >
                              REMOVE
                            </Button>
                          </div>

                          {/* Badges */}
                          {img.is_primary && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg">
                              PRIMARY
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add More Button */}
                    {formData.product_images.length < 10 && (
                      <label
                        htmlFor="image-upload-more"
                        className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all bg-muted/10 group"
                      >
                        <div className="p-2 rounded-full bg-muted border border-border group-hover:border-primary/30 group-hover:scale-110 transition-all">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] mt-2 font-bold text-muted-foreground uppercase">Add Photo</span>
                        <input
                          id="image-upload-more"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Initial Upload Zone if empty */}
                {formData.product_images.length === 0 && (
                  <div className="space-y-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`block border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                        dragActive 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      } ${errors.imageFile ? 'border-destructive' : ''}`}
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto border border-primary/20">
                        {isUploadingImage ? (
                          <Loader2 className="w-7 h-7 text-primary animate-spin" />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-primary" />
                        )}
                      </div>
                      <p className="text-sm font-semibold">Drop your images here</p>
                      <p className="text-xs text-muted-foreground mt-2 px-4">
                        Upload up to 10 photos of your product.
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
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Uploading...</span>
                      <span className="text-[10px] font-bold text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-border">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                   <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                   <p className="text-[11px] text-blue-500 leading-tight">
                     First image will be used as the primary thumbnail across the store. Ensure high quality.
                   </p>
                </div>
              </div>
            </div>

            {/* Inventory & Pricing (Smart Section) */}
            <div className="space-y-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Inventory & Pricing</h3>
                
                {!isSimpleProduct && (
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-primary font-bold text-xs gap-1 group"
                    onClick={onSwitchToVariants}
                  >
                    View All Variants
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                )}
              </div>
              
              {isSimpleProduct ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium">Price (₱)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="bg-background focus-visible:ring-primary h-11"
                      />
                    </div>

                    {/* Stock */}
                    <div className="space-y-2">
                      <Label htmlFor="stock" className="text-sm font-medium">Initial Stock</Label>
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="bg-background focus-visible:ring-primary h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 border border-border rounded-lg">
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                      For simple products. Add variants in the <strong>Product Variants</strong> tab for multiple sizes or options.
                    </p>
                  </div>
                </>
              ) : (
                <Alert className="bg-primary/5 border-primary/20">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-xs font-bold text-primary uppercase">Variable Product Mode</AlertTitle>
                  <AlertDescription className="text-[11px] text-muted-foreground mt-1">
                    Pricing and stock are managed per variant. Go to the <strong>Product Variants</strong> tab to update them.
                  </AlertDescription>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full border-primary/30 hover:bg-primary/10 hover:text-primary h-8 font-bold text-[10px] uppercase tracking-wider"
                    onClick={onSwitchToVariants}
                  >
                    Manage Variants
                  </Button>
                </Alert>
              )}

              {/* SKU Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sku" className="text-sm font-medium">SKU (Stock Keeping Unit)</Label>
                  <div className="flex items-center gap-2">
                    {isGeneratingSku ? (
                      <span className="text-[10px] text-muted-foreground animate-pulse">Generating...</span>
                    ) : (
                      <Badge variant={skuMode === 'auto' ? "secondary" : "outline"} className={`text-[9px] uppercase h-4 px-1.5 ${skuMode === 'manual' ? 'text-cyan-500 border-cyan-500/30 font-bold' : 'text-muted-foreground'}`}>
                        {skuMode === 'auto' ? 'Auto-generated' : 'Custom'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g., FP-JASRICE-001"
                    className={`bg-background focus-visible:ring-primary h-11 pr-10 uppercase transition-all ${skuError ? 'border-destructive focus-visible:ring-destructive text-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setSkuMode('auto')}
                    title="Regenerate SKU"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGeneratingSku ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                {skuError ? (
                  <p className="text-[11px] text-destructive flex items-center gap-1 font-medium bg-destructive/5 p-1.5 rounded border border-destructive/10">
                    <AlertCircle className="w-3 h-3" />
                    {skuError}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Auto-generated from product name and category. You can edit this manually.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions (Sticky Footer) */}
      <div className="flex-none flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isSuccess && (
            <div className="flex items-center gap-2 text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              Product Updated
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showCancel && onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading || isUploadingImage}
              className="hover:bg-muted font-medium"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading || isUploadingImage} 
            className="min-w-[140px] shadow-lg shadow-primary/20 font-bold"
          >
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
      </div>
    </form>
  );
}
