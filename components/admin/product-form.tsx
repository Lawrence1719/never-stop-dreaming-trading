"use client";

import { useState, useEffect, useRef } from "react";
// Removed: import { MAIN_CATEGORIES } from "@/lib/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { product_images?: any[] };
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  submitText?: string;
  isLoading?: boolean;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  showCancel = true,
  submitText = "Save Product",
  isLoading = false,
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
  });

  // Categories from DB
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Category selection state
  const [mainCategory, setMainCategory] = useState<string>(initialCategory);

  // Image upload & gallery state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData | "mainCategory" | "imageFile", string>>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
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
    
    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < imagesToProcess.length; i++) {
        const img = imagesToProcess[i];
        
        if (img.file) {
          // It's a new upload
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, img.file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;
          
          finalImages.push({
            storage_path: data.path, // Store only path!
            is_primary: img.is_primary,
            sort_order: i
          });
        } else {
          // It's an existing image
          finalImages.push({
            ...img,
            sort_order: i
          });
        }
        setUploadProgress(Math.round(((i + 1) / imagesToProcess.length) * 100));
      }

      return finalImages;
    } catch (error: any) {
      console.error('Image upload error:', error);
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
    setSubmissionError(null);
    setIsSuccess(false);

    const validationErrors = validateForm();
    if (validationErrors) {
      console.warn("Validation failed:", validationErrors);
      return;
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
      setSubmissionError(err instanceof Error ? err.message : "Failed to save product. Please try again.");
    }
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



      {/* Category Selection */}
      <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
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
          <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm font-medium text-primary">
              Category: <span className="font-bold">{formData.category}</span>
            </p>
          </div>
        )}
            {/* Image Upload Gallery */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          Product Gallery ({formData.product_images.length})
        </Label>
        
        {/* Gallery Grid */}
        {formData.product_images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {formData.product_images.map((img, index) => {
              const imageUrl = img.preview || (img.storage_path ? (
                img.storage_path.startsWith('http') 
                  ? img.storage_path 
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`
              ) : "/placeholder-image.jpg");

              return (
                <div 
                  key={index} 
                  className={`relative group aspect-square border-2 rounded-lg overflow-hidden bg-muted/30 transition-all ${
                    img.is_primary ? "border-primary shadow-md" : "border-border"
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 px-2">
                    {!img.is_primary && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="w-full text-[10px] h-7"
                        onClick={() => setPrimaryImage(index)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full text-[10px] h-7"
                      onClick={() => removeImage(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  {/* Badges */}
                  {img.is_primary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                      PRIMARY
                    </div>
                  )}
                  {img.file && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                      NEW
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Add More Button */}
            <label
              htmlFor="image-upload-more"
              className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] mt-1 font-medium text-muted-foreground uppercase">Add More</span>
              <input
                id="image-upload-more"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
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
              className={`block border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              } ${errors.imageFile ? 'border-destructive' : ''}`}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 mx-auto">
                {isUploadingImage ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                You can upload up to 10 images. Primary image will be used in lists.
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
      </div>
      {isUploadingImage && uploadProgress > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Uploading images... {uploadProgress}%
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          First image will be used as the primary thumbnail. You can upload up to 10 images.
        </p>
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

      {/* Error Message */}
      {submissionError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 text-destructive shadow-sm animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{submissionError}</p>
        </div>
      )}

      {/* Success Message */}
      {isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-3 text-emerald-800 shadow-sm animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">Product information updated successfully!</p>
        </div>
      )}

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
