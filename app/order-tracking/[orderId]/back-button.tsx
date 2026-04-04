"use client";

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-primary hover:underline mb-2"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </button>
  );
}
