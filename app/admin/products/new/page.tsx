'use client';

import { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductForm, ProductFormData } from '@/components/admin/product-form';
import { supabase } from '@/lib/supabase/client';

export default function CreateProductPage() {
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch('/api/admin/products', {
        method: 'POST',
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
        throw new Error(payload.error || 'Failed to create product');
      }

      const payload = await res.json();
      setSuccessMessage('Product created! Redirecting to variants...');
      setTimeout(() => {
        router.push(`/admin/products/${payload.data.id}/variants`);
      }, 1000);
    } catch (err) {
      console.error('Failed to create product', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
      throw err; // Re-throw for ProductForm to handle
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Add a new product and set up its image gallery.</p>
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
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        onCancel={() => router.back()}
        submitText="Create Product"
      />

      {/* Creation Guide */}
      <Card className="mt-6 border-primary/10 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Product Creation Guide</CardTitle>
          <CardDescription>Follow these steps to complete your product setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <li className="flex gap-3 items-center p-3 bg-background rounded-md border border-border">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">1</span>
              <span>General Info & Gallery</span>
            </li>
            <li className="flex gap-3 items-center p-3 bg-muted/50 rounded-md border border-dashed border-border text-muted-foreground">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">2</span>
              <span>Variants & Pricing</span>
            </li>
            <li className="flex gap-3 items-center p-3 bg-muted/50 rounded-md border border-dashed border-border text-muted-foreground">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">3</span>
              <span>Inventory & SKU</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
