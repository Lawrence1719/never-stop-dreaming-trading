'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Route: /admin/products/variants/[id]
 * Purpose: Acts as a deep-link handler for variants. 
 * Redirects the user to the correct product edit page with the variants tab pre-selected.
 */
export default function VariantRedirectPage() {
  const router = useRouter();
  const { id } = useParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVariantAndRedirect() {
      if (!id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('product_variants')
          .select('product_id')
          .eq('id', id)
          .single();

        if (fetchError || !data) {
          console.error('Variant not found:', fetchError);
          setError('Variant not found or has been deleted.');
          return;
        }

        // Redirect to the tabbed edit page
        router.replace(`/admin/products/${data.product_id}/edit?tab=variants&variantId=${id}`);
      } catch (err) {
        console.error('Unexpected error during redirect:', err);
        setError('Something went wrong. Please try again.');
      }
    }

    fetchVariantAndRedirect();
  }, [id, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
        <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <button 
          onClick={() => router.push('/admin/products')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md transition-colors"
        >
          Go to Products
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4 animate-in fade-in duration-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground animate-pulse">Navigating to variant details...</p>
    </div>
  );
}
