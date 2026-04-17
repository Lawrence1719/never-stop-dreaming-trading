'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Download, Trash2, Edit, Eye, AlertCircle, Package, Tag, Calendar, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils/formatting';
import { MAIN_CATEGORIES } from '@/lib/data/categories';
import { ProductImage } from '@/components/shared/ProductImage';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  image_url: string | null;
  product_images?: Array<{ storage_path: string; is_primary?: boolean }>;
  is_active?: boolean;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  product_variants?: Array<{id: string; variant_label: string; price: number; stock: number; sku: string; is_active: boolean}>;
  variants?: Array<{label: string; price: string; stock: number; sku: string; status: 'active' | 'inactive'}>;
  variant_count?: number;
  total_stock?: number;
  price_range?: string;
  variant_names?: string[];
  supplier_name?: string;
}

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
};

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewProductOpen, setViewProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const itemsPerPage = 15;

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const getProductStatusBadge = (status: 'active' | 'inactive') =>
    status === 'active' ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="destructive">Inactive</Badge>
    );

  const getProductDisplayImage = (product: Product) => {
    if (product.image_url) return product.image_url;
    const primary = product.product_images?.find((img) => img.is_primary);
    return primary?.storage_path || product.product_images?.[0]?.storage_path || undefined;
  };

  const loadProductDetails = async (productId: string, baseProduct?: Product) => {
    // Open modal immediately with base data
    if (baseProduct) {
      setSelectedProduct(baseProduct);
      setViewProductOpen(true);
    }
    setIsDetailLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'GET',
        credentials: 'include',
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load product details');
      }

      const payload = await res.json();

      const productData = payload.data;
      
      // Image fallback: use image_url first, then product_images[0] if available
      let displayImage = productData.image_url;
      if (!displayImage && productData.product_images && productData.product_images.length > 0) {
        const primaryImage = productData.product_images.find((img: any) => img.is_primary) || productData.product_images[0];
        displayImage = primaryImage?.storage_path;
      }

      const variants = (productData.product_variants || []).map((variant: any) => ({
        label: variant.variant_label,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        status: variant.is_active ? 'active' : 'inactive',
      }));

      const totalStock = (productData.product_variants || []).reduce(
        (sum: number, variant: any) => sum + (variant.stock ?? 0),
        0
      );

      const activeVariantPrices = (productData.product_variants || [])
        .filter((variant: any) => variant.is_active)
        .map((variant: any) => Number(variant.price))
        .filter((price: number) => !Number.isNaN(price));

      const minPrice = activeVariantPrices.length ? Math.min(...activeVariantPrices) : null;
      const maxPrice = activeVariantPrices.length ? Math.max(...activeVariantPrices) : null;
      const priceRange = minPrice !== null && maxPrice !== null
        ? minPrice === maxPrice
          ? formatPrice(minPrice)
          : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
        : 'N/A';

      setSelectedProduct({
        ...productData,
        image_url: displayImage,
        status: productData.is_active ? 'active' : 'inactive',
        total_stock: totalStock,
        price_range: priceRange,
        variant_count: productData.product_variants?.length ?? 0,
        variants,
      });
      setViewProductOpen(true);
    } catch (err) {
      console.error('Failed to load product details', err);
      toast({
        variant: 'destructive',
        title: 'Unable to load product',
        description: err instanceof Error ? err.message : 'Failed to load product details',
      });
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Reset page to 1 when filters change natively
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, categoryFilter]);

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setDeletingProductId(productId);
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

      // Remove product from list
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      
      toast({
        title: 'Product deleted',
        description: `"${product?.name || 'Product'}" has been successfully removed from the catalog.`,
      });
    } catch (err) {
      console.error('Failed to delete product', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete product',
      });
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    
    async function fetchProducts() {
      setIsLoading(true);
      setError(null);
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());

        const res = await fetch(`/api/admin/products?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load products');
        }

        const payload = await res.json();
        setProducts(payload.data || []);
        setTotalPages(payload.meta?.totalPages || 1);
        setTotalFiltered(payload.meta?.totalFiltered || 0);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to load products', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
        setProducts([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchProducts();

    return () => controller.abort();
  }, [debouncedSearchTerm, statusFilter, categoryFilter, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your store products</p>
        </div>
        <Link href="/admin/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Product Management</CardTitle>
          <CardDescription>View and manage all your products</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {MAIN_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead className="text-right">Total Stock</TableHead>
                  <TableHead>Price Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => loadProductDetails(product.id, product)}
                    >
                      <TableCell className="py-2">
                        <div
                          className="w-10 h-10 rounded-lg overflow-hidden border border-border/50 bg-muted shrink-0"
                          aria-label={`View details for ${product.name}`}
                        >
                          <ProductImage src={getProductDisplayImage(product) || ''} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium py-2">
                        {product.name}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs text-muted-foreground line-clamp-1" title={product.supplier_name || '—'}>
                          {product.supplier_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">{product.category}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(product.variant_names || []).slice(0, 2).map((v, i) => (
                            <Badge key={`${v}-${i}`} variant="secondary" className="px-1.5 py-0 text-[10px] font-medium whitespace-nowrap rounded-md">
                              {v}
                            </Badge>
                          ))}
                          {(product.variant_names || []).length > 2 && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium whitespace-nowrap rounded-md">
                              +{(product.variant_names?.length || 0) - 2} more
                            </Badge>
                          )}
                          {(!product.variant_names || product.variant_names.length === 0) && (
                            <span className="text-xs text-muted-foreground">No variants</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <Badge
                          variant={(product.total_stock ?? 0) > 10 ? 'default' : (product.total_stock ?? 0) > 0 ? 'secondary' : 'destructive'}
                        >
                          {product.total_stock ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm py-2">{product.price_range}</TableCell>
                      <TableCell className="py-2">{getProductStatusBadge(product.status || 'inactive')}</TableCell>
                      <TableCell className="py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${product.id}/variants`} className="gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <Eye className="h-4 w-4" />
                                Manage Variants
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                loadProductDetails(product.id, product);
                              }}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${product.id}/edit`} className="gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <Edit className="h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              asChild
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="w-full text-left px-2 py-1.5 text-sm text-destructive gap-2 flex items-center hover:bg-accent rounded">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
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
                                      onClick={() => handleDeleteProduct(product.id)}
                                      disabled={deletingProductId === product.id}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deletingProductId === product.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        'Delete'
                                      )}
                                    </AlertDialogAction>
                                  </div>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {products.length} product{products.length !== 1 ? 's' : ''} of {totalFiltered}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="flex items-center px-3 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Product Details Modal */}
      {viewProductOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={() => setViewProductOpen(false)}
        >
          <div
            className="w-full max-w-[860px] max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {isDetailLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 p-6">
                {/* LEFT COLUMN - Skeleton Image */}
                <div className="space-y-4">
                  <div className="w-full h-[280px] rounded-lg bg-muted animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                  </div>
                </div>

                {/* RIGHT COLUMN - Skeleton Content */}
                <div className="space-y-6">
                  {/* Product Name Skeleton */}
                  <div className="h-9 bg-muted rounded animate-pulse" />

                  {/* Info Grid Skeleton */}
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-4 h-4 bg-muted rounded animate-pulse mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-muted rounded animate-pulse w-16" />
                          <div className="h-4 bg-muted rounded animate-pulse w-20" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Description Skeleton */}
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse w-20" />
                    <div className="h-4 bg-muted rounded animate-pulse w-full" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  </div>

                  {/* Variants Table Skeleton */}
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded animate-pulse w-16" />
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 border-b border-border p-3">
                        <div className="flex gap-4">
                          <div className="h-3 bg-muted rounded animate-pulse w-12" />
                          <div className="h-3 bg-muted rounded animate-pulse w-10" />
                          <div className="h-3 bg-muted rounded animate-pulse w-8" />
                          <div className="h-3 bg-muted rounded animate-pulse w-16" />
                          <div className="h-3 bg-muted rounded animate-pulse w-12" />
                        </div>
                      </div>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-3 border-b border-border/50 last:border-b-0">
                          <div className="flex gap-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-16" />
                            <div className="h-4 bg-muted rounded animate-pulse w-12" />
                            <div className="h-4 bg-muted rounded animate-pulse w-10" />
                            <div className="h-4 bg-muted rounded animate-pulse w-20" />
                            <div className="h-4 bg-muted rounded animate-pulse w-14" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 p-6">
                {/* LEFT COLUMN - Image & Badges */}
                <div className="space-y-4">
                  <div className="w-full h-[280px] rounded-lg overflow-hidden border border-border bg-muted">
                    <ProductImage
                      src={getProductDisplayImage(selectedProduct!) || ''}
                      alt={selectedProduct?.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-xs">{selectedProduct?.category || 'Uncategorized'}</Badge>
                    {selectedProduct && getProductStatusBadge(selectedProduct.status || 'inactive')}
                  </div>
                </div>

                {/* RIGHT COLUMN - Details */}
                <div className="space-y-6">
                  {/* Product Name */}
                  <h2 className="text-3xl font-bold tracking-tight whitespace-normal break-words">
                    {selectedProduct?.name}
                  </h2>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Tag className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                        <p className="font-medium text-sm mt-1">{selectedProduct?.category || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                          selectedProduct?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                        <p className="font-medium text-sm mt-1 capitalize">{selectedProduct?.status || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Price Range</p>
                        <p className="font-medium text-sm mt-1">{selectedProduct?.price_range || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Stock</p>
                        <p className="font-medium text-sm mt-1">{selectedProduct?.total_stock ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                        <p className="font-medium text-sm mt-1">{formatDate(selectedProduct?.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Updated</p>
                        <p className="font-medium text-sm mt-1">{formatTimeAgo(selectedProduct?.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Description</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedProduct?.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Variants */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">Variants</p>
                    {selectedProduct?.variants?.length ? (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b border-border">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Variant</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Price</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Stock</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">SKU</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedProduct.variants || []).map((variant, idx) => (
                                <tr key={variant.sku} className={`${idx !== (selectedProduct.variants?.length || 0) - 1 ? 'border-b border-border/50' : ''}`}>
                                  <td className="px-3 py-2 text-sm">{variant.label}</td>
                                  <td className="px-3 py-2 text-sm">{variant.price}</td>
                                  <td className="px-3 py-2 text-sm">{variant.stock}</td>
                                  <td className="px-3 py-2 text-sm font-mono text-xs text-muted-foreground">{variant.sku}</td>
                                  <td className="px-3 py-2 text-sm">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                      variant.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-700'
                                        : 'bg-slate-500/10 text-slate-700'
                                    }`}>
                                      {variant.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No variants available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border bg-muted/30 px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setViewProductOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedProduct) {
                    window.location.href = `/admin/products/${selectedProduct.id}/edit`;
                  }
                }}
              >
                Edit Product
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-3">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (selectedProduct) {
                          handleDeleteProduct(selectedProduct.id);
                          setViewProductOpen(false);
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
