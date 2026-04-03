'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductVariantsPage({ params }: { params: any }) {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new tabbed edit page
    params.then((p: any) => {
      router.replace(`/admin/products/${p.id}/edit?tab=variants`);
    });
  }, [params, router]);

  return null;
}
