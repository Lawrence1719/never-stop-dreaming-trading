'use client';

import { Suspense, useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductForm, ProductFormData } from '@/components/admin/product-form';
import { supabase } from '@/lib/supabase/client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManageVariantsPage } from '@/components/admin/manage-variants-page';

import { useToast } from '@/hooks/use-toast';

function EditProductContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params.id as string;

  const searchParams = useSearchParams();
  const [initialData, setInitialData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');

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

      toast({
        title: "Success",
        description: "Product updated successfully!",
        variant: "success",
      });
      
    } catch (err) {
      console.error('Failed to update product', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update product',
        variant: "destructive",
      });
      throw err; // Re-throw for ProductForm to handle
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
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
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full max-w-md animate-pulse" />
          <div className="h-[400px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full animate-pulse" />
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

  // Merge first variant data into initialData for the form
  const productWithVariantData = initialData ? {
    ...initialData,
    price: initialData.product_variants?.[0]?.price ?? 0,
    stock: initialData.product_variants?.[0]?.stock ?? 0,
    sku: initialData.product_variants?.[0]?.sku ?? "",
  } : null;

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] space-y-4">
      <div className="flex-none flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage product information, gallery, and variants.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            General Info
          </TabsTrigger>
          <TabsTrigger value="variants" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Product Variants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 flex-1 flex flex-col overflow-hidden min-h-0 focus-visible:outline-none outline-none">
          <Card className="flex-1 flex flex-col border-border/50 shadow-sm overflow-hidden min-h-0">
            <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-4">
              <CardTitle className="text-xl">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ProductForm 
                initialData={productWithVariantData} 
                onSubmit={handleSubmit}
                isLoading={isSaving}
                onCancel={() => router.push('/admin/products')}
                submitText="Update Product"
                variantCount={initialData?.product_variants?.length || 0}
                onSwitchToVariants={() => setActiveTab('variants')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="mt-4 flex-1 flex flex-col overflow-hidden min-h-0 focus-visible:outline-none outline-none">
          <ManageVariantsPage productId={productId} isTab={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-96 bg-muted rounded-xl animate-pulse" />
      </div>
    }>
      <EditProductContent />
    </Suspense>
  );
}
