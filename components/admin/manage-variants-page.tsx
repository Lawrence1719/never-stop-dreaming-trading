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
import { formatPrice } from "@/lib/utils/formatting";
import { ProductVariantForm } from "@/components/admin/product-variant-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Plus, Edit2, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Product, ProductVariant } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ManageVariantsPageProps {
  productId: string;
  isTab?: boolean;
}

export function ManageVariantsPage({ productId, isTab = false }: ManageVariantsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);

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
        toast({
          title: 'Variant Updated',
          description: 'Product variant has been updated successfully.',
          variant: 'success',
        });
      } else {
        setVariants((prev) => [result.data, ...prev]);
        toast({
          title: 'Variant Added',
          description: 'Product variant has been added successfully.',
          variant: 'success',
        });
      }

      handleCloseDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save variant";
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!variantToDelete) return;

    setIsDeleting(variantToDelete.id);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/admin/products/variants/${variantToDelete.id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete variant");
      }

      setVariants((prev) => prev.filter((v) => v.id !== variantToDelete.id));
      setDeleteDialogOpen(false);
      setVariantToDelete(null);
      toast({
        title: 'Variant Deleted',
        description: 'Product variant has been deleted successfully.',
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete variant";
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
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
      toast({
        title: 'Status Updated',
        description: `Variant "${variant.variant_label}" is now ${!variant.is_active ? 'active' : 'inactive'}.`,
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update variant";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
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
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-destructive">Product not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isTab ? "space-y-4" : "space-y-6"}`}>
      {/* Header - Hidden if in Tab view */}
      {!isTab && (
        <div className="flex-none flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-muted font-medium transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {product.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">Manage product variants</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 shadow-lg shadow-primary/20 font-bold px-6">
            <Plus className="h-4 w-4" />
            Add Variant
          </Button>
        </div>
      )}

      {isTab && (
        <div className="flex-none flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Product Variants</h2>
            <p className="text-muted-foreground text-sm font-medium">Manage inventory and pricing for all variants.</p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()} 
            size="default" 
            className="gap-2 font-bold px-5 shadow-lg shadow-primary/10 transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Variant
          </Button>
        </div>
      )}

      {/* Variants List Container */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-border">
        {isLoadingVariants ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-4 bg-muted/20 rounded-xl border-2 border-dashed border-border/50">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading variants...</p>
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center">
            <div className="p-4 rounded-full bg-muted border border-border mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-1">No variants yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">Create one or more variants (e.g. different sizes, weights) to start managing your stock.</p>
            <Button onClick={() => handleOpenDialog()} className="font-bold">Create First Variant</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant) => {
              const isLowStock = variant.stock <= (variant.reorder_threshold || 5);
              const isOutOfStock = variant.stock === 0;

              return (
                <div 
                  key={variant.id}
                  className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-card border border-border/50 rounded-xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-1 items-start gap-4">
                    <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-muted border border-border/30 text-muted-foreground font-black uppercase text-xs">
                      {variant.variant_label.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">
                        {variant.variant_label}
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        SKU: <span className="text-foreground/80">{variant.sku}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-4 md:mt-0 items-center">
                    {/* Price */}
                    <div className="text-left md:text-right px-4 border-l border-border/30 md:border-l-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Price</p>
                      <p className="text-base font-black text-foreground">{formatPrice(Number(variant.price))}</p>
                    </div>

                    {/* Inventory */}
                    <div className="text-left px-4 border-l border-border md:border-l border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Inventory</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isOutOfStock ? "destructive" : isLowStock ? "outline" : "secondary"}
                          className={`font-black px-2.5 py-0.5 text-xs shadow-sm ${
                            isOutOfStock 
                              ? "bg-destructive text-destructive-foreground animate-pulse" 
                              : isLowStock 
                                ? "border-amber-500 text-amber-500 bg-amber-500/10" 
                                : "bg-green-500/10 text-green-600 border-green-200"
                          }`}
                        >
                          {variant.stock} IN STOCK
                        </Badge>
                        <span className="text-[10px] subpixel-antialiased text-muted-foreground/70 font-medium">
                          Min: {variant.reorder_threshold || 5}
                        </span>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-3 pt-4 border-t lg:border-t-0 lg:pt-0 border-border/20">
                      <div 
                        className="cursor-pointer transition-transform active:scale-95" 
                        onClick={() => toggleVariantStatus(variant)}
                      >
                        <Badge 
                          variant={variant.is_active ? "default" : "secondary"}
                          className={`font-bold text-[10px] uppercase ${
                            variant.is_active 
                              ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                              : "bg-muted text-muted-foreground grayscale"
                          }`}
                        >
                          {variant.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(variant)}
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setVariantToDelete(variant);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={isDeleting === variant.id}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          {isDeleting === variant.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

      {/* Delete Variant Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete variant <strong>{variantToDelete?.variant_label}</strong> (SKU: {variantToDelete?.sku})? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting === variantToDelete?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVariant}
              disabled={isDeleting === variantToDelete?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting === variantToDelete?.id ? 'Deleting...' : 'Delete Variant'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
