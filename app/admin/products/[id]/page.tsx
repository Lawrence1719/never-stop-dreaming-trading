'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, AlertCircle, ImageIcon } from 'lucide-react';
import { ProductImage } from '@/components/shared/ProductImage';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase/client';
import { formatPrice, formatDateTime } from '@/lib/utils/formatting';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  sale_price: number | null;
  stock: number;
  is_active: boolean;
  image_url: string | null;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export default function ViewProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        setProduct(payload.data);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete product');
      }

      // Redirect to products page
      window.location.href = '/admin/products';
    } catch (err) {
      console.error('Failed to delete product', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mt-2 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
            <p className="text-muted-foreground mt-1">View product information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/products/${productId}/edit`}>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                <p className="text-lg font-semibold mt-1">{product.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SKU</label>
                <p className="text-sm font-mono mt-1">{product.sku}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{product.description || 'No description'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Regular Price</label>
                  <p className="text-2xl font-bold mt-1">{formatPrice(product.price)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold">{product.stock}</p>
                  <Badge
                    variant={
                      product.stock > 10
                        ? 'default'
                        : product.stock > 0
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {product.stock > 10
                      ? 'In Stock'
                      : product.stock > 0
                      ? 'Low Stock'
                      : 'Out of Stock'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                Product Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted shadow-inner">
                <ProductImage 
                  src={product.image_url || (product.images && product.images[0])} 
                  alt={product.name} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{product.category || 'Uncategorized'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={product.is_active ? 'default' : 'outline'}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="text-muted-foreground">Created</label>
                <p className="text-xs">
                  {formatDateTime(product.created_at)}
                </p>
              </div>
              <div>
                <label className="text-muted-foreground">Updated</label>
                <p className="text-xs">
                  {formatDateTime(product.updated_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
