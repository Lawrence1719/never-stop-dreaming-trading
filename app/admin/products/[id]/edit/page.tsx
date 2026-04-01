'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductForm, ProductFormData } from '@/components/admin/product-form';
import { supabase } from '@/lib/supabase/client';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [initialData, setInitialData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(`/api/admin/products/${productId}`, {
          method: 'GET',
          credentials: 'include',
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load product');
        }

        const payload = await res.json();
        setInitialData(payload.data);
      } catch (err) {
        console.error('Failed to load product', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handleSubmit = async (data: ProductFormData) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...data,
          status: data.is_active ? 'active' : 'inactive',
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update product');
      }

      setSuccessMessage('Product updated successfully!');
      setTimeout(() => {
        router.push(`/admin/products/${productId}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to update product', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
      throw err; // Re-throw for ProductForm to handle
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/admin/products/${productId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64 mt-2 animate-pulse" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
          </div>

          {/* Category */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
          </div>

          {/* Gallery */}
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 1 }).map((_, i) => (
                <div key={i} className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !initialData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          </div>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Error Loading Product</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/products/${productId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Update product information and manage the image gallery.</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      <ProductForm 
        initialData={initialData} 
        onSubmit={handleSubmit}
        isLoading={isSaving}
        onCancel={() => router.back()}
        submitText="Update Product"
      />
    </div>
  );
}
