'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface CMSPageContentProps {
  slug: string;
  fallback: React.ReactNode;
}

export function CMSPageContent({ slug, fallback }: CMSPageContentProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch('/api/cms/pages');
        if (!res.ok) throw new Error('Failed to fetch pages');
        const payload = await res.json();
        const pages = payload.data || [];
        const page = pages.find((p: any) => p.slug === slug);
        if (page && page.content) {
          setContent(page.content);
        }
      } catch (err) {
        console.error(`Error loading CMS page ${slug}:`, err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (content) {
    return (
      <div 
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <>{fallback}</>;
}
