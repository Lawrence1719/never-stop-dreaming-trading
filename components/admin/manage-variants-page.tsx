"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductVariantForm } from "@/components/admin/product-variant-form";
import { AlertCircle, Plus, Edit2, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Product, ProductVariant } from "@/lib/types";

interface ManageVariantsPageProps {
  productId: string;
}

export function ManageVariantsPage({ productId }: ManageVariantsPageProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Fetch variants
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setIsLoadingVariants(true);
        const { data, error } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setVariants(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load variants");
      } finally {
        setIsLoadingVariants(false);
      }
    };

    fetchVariants();
  }, [productId]);

  const handleOpenDialog = (variant?: ProductVariant) => {
    setSelectedVariant(variant || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedVariant(null);
  };

  const handleSubmitVariant = async (
    data: Omit<ProductVariant, "id" | "product_id" | "created_at" | "updated_at"> & {
      product_id: string;
    }
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let response;

      if (selectedVariant?.id) {
        // Update existing variant
        response = await fetch(`/api/admin/products/variants/${selectedVariant.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        });
      } else {
        // Create new variant
        response = await fetch("/api/admin/products/variants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save variant");
      }

      const result = await response.json();

      // Update variants list
      if (selectedVariant?.id) {
        setVariants((prev) =>
          prev.map((v) => (v.id === result.data.id ? result.data : v))
        );
      } else {
        setVariants((prev) => [result.data, ...prev]);
      }

      handleCloseDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save variant";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to delete this variant? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(variantId);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/admin/products/variants/${variantId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete variant");
      }

      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete variant";
      setError(message);
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleVariantStatus = async (variant: ProductVariant) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/admin/products/variants/${variant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          is_active: !variant.is_active,
        }),
      });

      if (!response.ok) throw new Error("Failed to update variant");

      const result = await response.json();
      setVariants((prev) =>
        prev.map((v) => (v.id === result.data.id ? result.data : v))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update variant";
      setError(message);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive">Product not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground mt-1">Manage product variants</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Variant
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Variants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Variants</CardTitle>
          <CardDescription>
            {variants.length === 0
              ? "No variants yet. Create one to get started."
              : `${variants.length} variant${variants.length !== 1 ? "s" : ""} available`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingVariants ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : variants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No variants yet</p>
              <Button onClick={() => handleOpenDialog()}>Create First Variant</Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Reorder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.variant_label}</TableCell>
                      <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                      <TableCell className="text-right">₱{Number(variant.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            variant.stock === 0
                              ? "destructive"
                              : variant.stock <= (variant.reorder_threshold || 5)
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {variant.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>{variant.reorder_threshold || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={variant.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleVariantStatus(variant)}
                        >
                          {variant.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(variant)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVariant(variant.id)}
                            disabled={isDeleting === variant.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {isDeleting === variant.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVariant ? "Edit Variant" : "Create New Variant"}
            </DialogTitle>
            <DialogDescription>
              {selectedVariant
                ? `Update the variant details for "${product.name}"`
                : `Add a new variant for "${product.name}" (e.g., different size, weight, or format)`}
            </DialogDescription>
          </DialogHeader>
          <ProductVariantForm
            productId={productId}
            initialData={selectedVariant || undefined}
            onSubmit={handleSubmitVariant}
            onCancel={handleCloseDialog}
            submitText={selectedVariant ? "Update Variant" : "Create Variant"}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
