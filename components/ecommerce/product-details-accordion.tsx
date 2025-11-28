"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ProductDetailsAccordionProps {
  product: {
    name: string;
    description: string;
    specifications: Record<string, string>;
    stock: number;
    category: string;
  };
}

export function ProductDetailsAccordion({ product }: ProductDetailsAccordionProps) {
  // Extract food-specific details from specifications
  const ingredients = product.specifications?.ingredients || product.specifications?.Ingredients || '';
  const nutrition = product.specifications?.nutrition || product.specifications?.Nutrition || '';
  const storage = product.specifications?.storage || product.specifications?.Storage || '';
  const shelfLife = product.specifications?.shelf_life || product.specifications?.['Shelf Life'] || '';
  const servings = product.specifications?.servings || product.specifications?.Servings || '';
  const allergens = product.specifications?.allergens || product.specifications?.Allergens || '';

  return (
    <Accordion type="single" collapsible className="w-full">
      {/* Description */}
      <AccordionItem value="description">
        <AccordionTrigger className="text-left">
          <span className="font-semibold">Product Description</span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
        </AccordionContent>
      </AccordionItem>

      {/* Ingredients */}
      {ingredients && (
        <AccordionItem value="ingredients">
          <AccordionTrigger className="text-left">
            <span className="font-semibold">Ingredients</span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-muted-foreground whitespace-pre-line">{ingredients}</p>
            {allergens && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Allergen Information:
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{allergens}</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Nutritional Information */}
      {nutrition && (
        <AccordionItem value="nutrition">
          <AccordionTrigger className="text-left">
            <span className="font-semibold">Nutritional Information</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-muted-foreground whitespace-pre-line">{nutrition}</div>
            {servings && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">Servings per package:</span> {servings}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Storage Instructions */}
      {(storage || shelfLife) && (
        <AccordionItem value="storage">
          <AccordionTrigger className="text-left">
            <span className="font-semibold">Storage & Shelf Life</span>
          </AccordionTrigger>
          <AccordionContent>
            {storage && (
              <div className="mb-3">
                <p className="font-medium mb-1">Storage Instructions:</p>
                <p className="text-muted-foreground whitespace-pre-line">{storage}</p>
              </div>
            )}
            {shelfLife && (
              <div>
                <p className="font-medium mb-1">Shelf Life:</p>
                <p className="text-muted-foreground">{shelfLife}</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Specifications */}
      <AccordionItem value="specifications">
        <AccordionTrigger className="text-left">
          <span className="font-semibold">Specifications</span>
        </AccordionTrigger>
        <AccordionContent>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium mb-1">SKU</dt>
              <dd className="text-sm text-muted-foreground">{product.specifications?.sku || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium mb-1">Category</dt>
              <dd className="text-sm text-muted-foreground">{product.category}</dd>
            </div>
            {product.specifications && Object.entries(product.specifications)
              .filter(([key]) => 
                !['ingredients', 'Ingredients', 'nutrition', 'Nutrition', 'storage', 'Storage', 
                  'shelf_life', 'Shelf Life', 'servings', 'Servings', 'allergens', 'Allergens', 'sku'].includes(key)
              )
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium mb-1">{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</dt>
                  <dd className="text-sm text-muted-foreground">{String(value)}</dd>
                </div>
              ))}
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

