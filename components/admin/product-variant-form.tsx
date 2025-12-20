"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { ProductVariant } from "@/lib/types";

interface ProductVariantFormProps {
  productId: string;
  initialData?: Partial<ProductVariant>;
  onSubmit: (data: Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at'> & { product_id: string }) => Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  submitText?: string;
  isLoading?: boolean;
}

export function ProductVariantForm({
  productId,
  initialData,
  onSubmit,
  onCancel,
  showCancel = true,
  submitText = initialData?.id ? "Update Variant" : "Create Variant",
  isLoading = false,
}: ProductVariantFormProps) {
  const [formData, setFormData] = useState({
    variant_label: initialData?.variant_label || "",
    price: initialData?.price?.toString() || "",
    stock: initialData?.stock?.toString() || "0",
    sku: initialData?.sku || "",
    reorder_threshold: initialData?.reorder_threshold?.toString() || "5",
    is_active: initialData?.is_active !== false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.variant_label.trim()) {
      newErrors.variant_label = "Variant label is required (e.g., '1kg', '5kg')";
    }

    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (parseFloat(formData.price) < 0) {
      newErrors.price = "Price cannot be negative";
    }

    if (formData.stock === "") {
      newErrors.stock = "Stock is required";
    } else if (parseInt(formData.stock) < 0) {
      newErrors.stock = "Stock cannot be negative";
    }

    if (!formData.sku.trim()) {
      newErrors.sku = "SKU is required and must be unique";
    }

    if (!formData.reorder_threshold) {
      newErrors.reorder_threshold = "Reorder threshold is required";
    } else if (parseInt(formData.reorder_threshold) < 0) {
      newErrors.reorder_threshold = "Threshold cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        product_id: productId,
        variant_label: formData.variant_label.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        sku: formData.sku.trim().toUpperCase(),
        reorder_threshold: parseInt(formData.reorder_threshold),
        is_active: formData.is_active,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save variant';
      setErrors({ submit: message });
    }
  };

  const errorFields = Object.keys(errors).filter(key => key !== 'submit');

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Error Summary */}
      {errors.submit && (
        <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{errors.submit}</p>
          </div>
        </div>
      )}

      {errorFields.length > 0 && !errors.submit && (
        <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Please fix the following errors:</p>
            <ul className="text-sm text-destructive/90 list-disc list-inside mt-2">
              {errorFields.map((field) => (
                <li key={field}>{errors[field]}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Variant Label */}
      <div>
        <Label htmlFor="variant_label">
          Variant Label <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          e.g., "1kg", "5kg", "150g", "1L", "6-pack", "12-pack"
        </p>
        <Input
          id="variant_label"
          name="variant_label"
          placeholder="e.g., 1kg"
          value={formData.variant_label}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.variant_label && touched.variant_label ? "border-destructive" : ""}
        />
        {errors.variant_label && touched.variant_label && (
          <p className="text-sm text-destructive mt-1">{errors.variant_label}</p>
        )}
      </div>

      {/* SKU */}
      <div>
        <Label htmlFor="sku">
          SKU <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Unique identifier for this variant (will be converted to uppercase)
        </p>
        <Input
          id="sku"
          name="sku"
          placeholder="e.g., RICE-1KG-001"
          value={formData.sku}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.sku && touched.sku ? "border-destructive" : ""}
        />
        {errors.sku && touched.sku && (
          <p className="text-sm text-destructive mt-1">{errors.sku}</p>
        )}
      </div>

      {/* Price */}
      <div>
        <Label htmlFor="price">
          Price <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.price}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`pl-8 ${errors.price && touched.price ? "border-destructive" : ""}`}
          />
        </div>
        {errors.price && touched.price && (
          <p className="text-sm text-destructive mt-1">{errors.price}</p>
        )}
      </div>

      {/* Stock */}
      <div>
        <Label htmlFor="stock">
          Stock <span className="text-destructive">*</span>
        </Label>
        <Input
          id="stock"
          name="stock"
          type="number"
          min="0"
          placeholder="0"
          value={formData.stock}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.stock && touched.stock ? "border-destructive" : ""}
        />
        {errors.stock && touched.stock && (
          <p className="text-sm text-destructive mt-1">{errors.stock}</p>
        )}
      </div>

      {/* Reorder Threshold */}
      <div>
        <Label htmlFor="reorder_threshold">
          Reorder Threshold <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Stock level that triggers a low-stock alert
        </p>
        <Input
          id="reorder_threshold"
          name="reorder_threshold"
          type="number"
          min="0"
          placeholder="5"
          value={formData.reorder_threshold}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.reorder_threshold && touched.reorder_threshold ? "border-destructive" : ""}
        />
        {errors.reorder_threshold && touched.reorder_threshold && (
          <p className="text-sm text-destructive mt-1">{errors.reorder_threshold}</p>
        )}
      </div>

      {/* Active Status */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 rounded border-input"
          />
          <span className="text-sm font-medium">Active (visible to customers)</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6">
        <Button
          type="submit"
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitText}
        </Button>
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
