'use client';

import { useState } from 'react';
import { ArrowLeft, Upload, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_TREE, MAIN_CATEGORIES } from '@/lib/data/categories';
import { supabase } from '@/lib/supabase/client';

export default function CreateProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    status: 'active',
  });
  
  // Generate a provisional SKU from category + name + random numeric suffix (server will ensure uniqueness)
  function generateSku(name?: string, category?: string) {
    const catCode = category
      ? (String(category).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 2) || 'CT')
      : 'CT';

    const nameCode = (() => {
      if (!name) return 'PRD';
      const cleaned = String(name).trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return words
          .slice(0, 3)
          .map((w) => (w[0] || '').toUpperCase())
          .join('')
          .slice(0, 3);
      }
      const compact = cleaned.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return compact.slice(0, 3) || 'PRD';
    })();

    const randNum = Math.floor(Math.random() * 9999) + 1;
    const numStr = String(randNum).padStart(4, '0');
    return `${catCode}-${nameCode}-${numStr}`;
  }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validation
      if (!formData.name || !formData.price || !formData.stock) {
        throw new Error('Missing required fields: name, price, stock');
      }

      // Ensure SKU exists (generate if user left it empty)
      const skuToUse = formData.sku && formData.sku.trim() !== '' ? formData.sku.trim() : generateSku(formData.name, formData.category);

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
          name: formData.name,
          sku: skuToUse,
          description: formData.description,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create product');
      }

      const payload = await res.json();
      setSuccessMessage('Product created successfully!');
      setTimeout(() => {
        router.push(`/admin/products/${payload.data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to create product', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
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
          <p className="text-muted-foreground mt-1">Add a new product to your store</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{successMessage}</p>
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="sku"
                      name="sku"
                      placeholder="Enter SKU or leave empty to auto-generate"
                      value={formData.sku}
                      onChange={handleChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData((prev) => ({ ...prev, sku: generateSku(prev.name) }))}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-2 h-32"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">Regular Price *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {/* Main Categories */}
                  {MAIN_CATEGORIES.map((mainCat) => (
                    <SelectItem key={mainCat} value={mainCat}>
                      {mainCat}
                    </SelectItem>
                  ))}
                  {/* Subcategories */}
                  {Object.entries(CATEGORY_TREE).map(([mainCat, subcats]) =>
                    subcats.map((subcat) => (
                      <SelectItem key={`${mainCat}-${subcat}`} value={subcat}>
                        {mainCat} → {subcat}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Link href="/admin/products" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
    </div>
  );
}
