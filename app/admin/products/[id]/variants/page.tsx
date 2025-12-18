'use client';

import { use } from 'react';
import { ManageVariantsPage } from '@/components/admin/manage-variants-page';

interface Params {
  id: string;
}

export default function ProductVariantsPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  return <ManageVariantsPage productId={id} />;
}
