"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { useSettings } from "@/lib/hooks/use-settings";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { QuantitySelector } from "@/components/ecommerce/quantity-selector";
import { StockIndicator } from "@/components/ecommerce/stock-indicator";
import { ProductImageGallery } from "@/components/ecommerce/product-image-gallery";
import { ProductBadges } from "@/components/ecommerce/product-badges";
import { ProductDetailsAccordion } from "@/components/ecommerce/product-details-accordion";
import { ProductRecommendations } from "@/components/ecommerce/product-recommendations";
import { ProductReviews } from "@/components/ecommerce/product-reviews";
import { StickyAddToCart } from "@/components/ecommerce/sticky-add-to-cart";
import { VariantSelector } from "@/components/ecommerce/variant-selector";
import { useCart } from "@/lib/context/cart-context";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useToast } from "@/hooks/use-toast";
import { Product, ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatting";
import { Heart, Share2, ChevronLeft, Users, Shield, ShoppingCart, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { VariantConfirmationModal } from "@/components/ecommerce/variant-confirmation-modal";

export default function ProductDetailPage() {
  const { id } = useParams();
  console.log('ProductDetailPage id:', id);

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
    const MIN_LOADING_MS = 300;
    const start = Date.now();

    const fetchProduct = async () => {
      try {
        if (!id) {
          console.warn('No product ID provided');
          return;
        }
        
        // Fetch current product with variants
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_variants (
              id,
              variant_label,
              price,
              stock,
              sku,
              is_active
            ),
            product_images (
              *
            )
          `)
          .eq('id', id)
          .single();
        console.log('Supabase fetch result:', { data, error });
        
        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        if (data && mounted) {
          const mapped: Product = {
            id: data.id,
            name: data.name,
            slug: data.slug || data.id,
            description: data.description || '',
            price: Number(data.price) || 0,
            compareAtPrice: data.compare_at_price ? Number(data.compare_at_price) : undefined,
            images: data.product_images?.length > 0
              ? data.product_images
                  .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map((img: any) => 
                    img.storage_path.startsWith('http') 
                      ? img.storage_path 
                      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`
                  )
              : data.image_url 
                ? (Array.isArray(data.image_url) ? data.image_url : [data.image_url])
                : [],
            product_images: data.product_images || [],
            category: data.category || '',
            stock: data.stock ?? 0,
            sku: data.sku || '',
            rating: data.rating ?? 0,
            reviewCount: data.review_count ?? 0,
            featured: data.featured ?? false,
            specifications: data.specifications || {},
            iot: data.iot || undefined,
            reorder_threshold: data.reorder_threshold ?? undefined,
            updated_at: data.updated_at ?? undefined,
            is_active: data.is_active ?? undefined,
            variants: data.product_variants?.filter((v: any) => v.is_active) || [],
          };
          setProduct(mapped);
          
          // Set first active variant as selected only if there's only one
          const activeVariants = data.product_variants?.filter((v: any) => v.is_active) || [];
          if (activeVariants.length > 0) {
            if (activeVariants.length === 1) {
              setSelectedVariant(activeVariants[0]);
            } else {
              setSelectedVariant(null);
            }
            setVariants(activeVariants);
          }
        }
        
        // Fetch all products for recommendations (including variants for correct pricing)
        const { data: allData, error: allError } = await supabase
          .from('products')
          .select(`
            *,
            product_variants (
              id,
              variant_label,
              price,
              stock,
              sku,
              is_active
            )
          `)
          .order('created_at', { ascending: false });
          
        if (!allError && allData && mounted) {
          const allMapped = allData.map((row: any) => {
            const rowVariants = row.product_variants?.filter((v: any) => v.is_active) || [];
            return {
              id: row.id,
              name: row.name,
              slug: row.slug || row.id,
              description: row.description || '',
              price: Number(row.price) || 0,
              compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
              images: row.image_url ? (Array.isArray(row.image_url) ? row.image_url : [row.image_url]) : [],
              category: row.category || '',
              stock: row.stock ?? 0,
              sku: row.sku || '',
              rating: row.rating ?? 0,
              reviewCount: row.review_count ?? 0,
              featured: row.featured ?? false,
              specifications: row.specifications || {},
              variants: rowVariants,
            };
          }) as Product[];
          
          setProducts(allMapped);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch product from Supabase:', err);
        
        // Check if Supabase is properly configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error(
            '❌ Supabase is not configured properly. ' +
            'Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
            'See .env.local.example for reference.'
          );
        }
        
        if (mounted) setProduct(null);
      } finally {
        const elapsed = Date.now() - start;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          loadingTimeout = setTimeout(() => {
            if (mounted) setLoading(false);
          }, remaining);
        } else {
          if (mounted) setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      mounted = false;
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [id]);
  const [quantity, setQuantity] = useState(1);
  const [showStickyCart, setShowStickyCart] = useState(false);
  const router = useRouter();
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const { settings } = useSettings();

  // Confirmation Modal and Validation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActionType, setModalActionType] = useState<'add' | 'buy'>('add');
  const [showVariantError, setShowVariantError] = useState(false);

  // Show sticky cart on mobile after scrolling past product details
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth < 768) {
        const scrollPosition = window.scrollY;
        setShowStickyCart(scrollPosition > 400);
      } else {
        setShowStickyCart(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb Skeleton */}
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-8 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {/* Image Skeleton */}
              <div className="space-y-4">
                <div className="bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden h-[400px] w-full animate-pulse" />
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg h-20 w-full animate-pulse" />
                  ))}
                </div>
              </div>
              {/* Details Skeleton */}
              <div className="space-y-4">
                <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="flex gap-2 mt-4">
                  <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
            {/* Specifications Skeleton */}
            <div className="border-t border-border pt-6">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3 animate-pulse" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
            {/* Related Products Skeleton */}
            <div className="border-t border-border pt-16">
              <ProductGrid products={[]} loading={true} title="Related Products" skeletonCount={4} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="mb-4 text-6xl">🔍</div>
            <h1 className="text-2xl font-bold mb-2">Product not found</h1>
            <p className="text-muted-foreground mb-6">
              The product you&apos;re looking for doesn&apos;t exist or may have been removed.
            </p>
            <div className="flex gap-3 justify-center">
              <Link 
                href="/products" 
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Products
              </Link>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 border border-input px-6 py-2 rounded-lg hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedProducts = products.filter((p) => p.category === product.category && p.id !== product.id);
  const inWishlist = isInWishlist(product.id);
  const discount = product.compareAtPrice && product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  const handleAddToCart = () => {
    if (variants.length > 0 && !selectedVariant) {
      setShowVariantError(true);
      return;
    }
    
    setModalActionType('add');
    setIsModalOpen(true);
  };

  const handleBuyNow = () => {
    if (variants.length > 0 && !selectedVariant) {
      setShowVariantError(true);
      return;
    }
    
    setModalActionType('buy');
    setIsModalOpen(true);
  };

  const handleConfirmedAction = () => {
    if (!selectedVariant && variants.length > 0) return;

    if (modalActionType === 'add') {
      addItem(product as Product, quantity, selectedVariant || undefined);
      toast({
        title: "Added to cart",
        description: `${quantity} ${quantity === 1 ? 'item' : 'items'} added successfully${selectedVariant ? ` (${selectedVariant.variant_label})` : ''}`,
        variant: "success",
      });
      setQuantity(1);
    } else {
      router.push(`/checkout?product=${product?.id}&quantity=${quantity}${selectedVariant ? `&variant=${selectedVariant.id}` : ''}`);
    }
    
    setIsModalOpen(false);
  };

  const handleWishlist = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast({
        title: "Removed from wishlist",
        description: "Product removed from your wishlist",
        variant: "info",
      });
    } else {
      addToWishlist(product.id);
      toast({
        title: "Added to wishlist",
        description: "Product added to your wishlist",
        variant: "success",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-8 lg:gap-12 mb-16 pb-8">
            {/* Images - Larger on desktop (60%) */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <ProductImageGallery images={product.images || []} productName={product.name} />
            </div>

            {/* Details - Right column (40%) */}
            <div className="space-y-6">
              {/* Product Header */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.name}</h1>
                      {/* Compact IoT dot indicator */}
                      {['Meat','Frozen goods','Dairy','Ice cream','Cold beverages','Refrigerated & Frozen'].includes(product.category) && (
                        (() => {
                          const status = product.iot?.status || 'unknown';
                          const colorClass =
                            status === 'online' ? 'bg-emerald-500' : status === 'offline' ? 'bg-rose-500' : status === 'error' ? 'bg-amber-500' : 'bg-slate-400';
                          return <span className={`w-3 h-3 rounded-full ${colorClass}`} aria-hidden="true" />;
                        })()
                      )}
                    </div>
                    {/* Product Badges */}
                    <ProductBadges
                      stock={selectedVariant?.stock ?? product.stock ?? 0}
                      reorderThreshold={product.reorder_threshold}
                      featured={product.featured}
                      purchaseCount={product.reviewCount * 10}
                      createdAt={product.updated_at}
                    />
                  </div>
                  {settings?.system.enableWishlist !== false && (
                    <button
                      onClick={handleWishlist}
                      className={`p-3 rounded-full transition-all hover:scale-110 ${
                        inWishlist
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart className="w-6 h-6" fill={inWishlist ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>

                {/* Pricing Panel - Prominent */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl md:text-4xl font-bold text-primary">
                      {formatPrice(selectedVariant?.price ?? product.price ?? 0)}
                    </span>
                    {product.compareAtPrice && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                        {((product.compareAtPrice - (selectedVariant?.price ?? product.price ?? 0)) / product.compareAtPrice * 100) > 0 && (
                          <span className="text-sm font-bold text-accent bg-accent/20 px-2 py-1 rounded">
                            Save {Math.round(((product.compareAtPrice - (selectedVariant?.price ?? product.price ?? 0)) / product.compareAtPrice) * 100)}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {product.compareAtPrice && (
                    <p className="text-sm text-muted-foreground">
                      Save {formatPrice(product.compareAtPrice - (selectedVariant?.price ?? product.price ?? 0))} vs regular price
                    </p>
                  )}
                </div>

                {/* Variant Selector */}
                {variants.length > 0 && (
                  <VariantSelector 
                    variants={variants}
                    selectedVariant={selectedVariant || undefined}
                    onVariantChange={(v) => {
                      setSelectedVariant(v);
                      setShowVariantError(false);
                    }}
                  />
                )}

                {/* Stock Status Card */}
                <div className="bg-secondary/10 border border-border rounded-lg p-4">
                  <StockIndicator 
                    stock={selectedVariant?.stock ?? product.stock ?? 0} 
                    reorderThreshold={product.reorder_threshold}
                    showDetailed={true}
                  />
                </div>
              </div>

              {/* Social Proof & Trust Signals */}
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                {/* Rating */}
                {product.reviewCount > 0 ? (
                  <div className="flex items-center gap-4" role="img" aria-label={`Rating: ${product.rating.toFixed(1)} out of 5 stars from ${product.reviewCount} reviews`}>
                    <div className="flex gap-1" aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-2xl transition-colors ${
                            i < Math.round(product.rating) ? "text-accent" : "text-muted"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold">
                        {product.rating.toFixed(1)} out of 5
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Based on {product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-secondary/10 rounded-lg border border-border" role="img" aria-label="No ratings yet">
                    <div className="flex justify-center gap-1 mb-2" aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-xl text-muted">
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-medium mb-1">No ratings yet</p>
                    <p className="text-xs text-muted-foreground">Be the first to review this product!</p>
                  </div>
                )}

                {/* Trust Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  {product.reviewCount > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Sold</p>
                        <p className="text-base font-bold">{product.reviewCount * 10}+</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quality</p>
                      <p className="text-base font-bold">NSD Guaranteed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>

              {/* Quantity & Actions Card */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                {/* Quantity Selector */}
                <QuantitySelector
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  max={selectedVariant?.stock || product.stock}
                />

                {/* Variant Selection Validation Error */}
                {showVariantError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-xs font-bold uppercase tracking-wide">Please select a variant before continuing</p>
                  </div>
                )}

                {/* Primary CTAs */}
                <div className="flex gap-3">
                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    disabled={(selectedVariant?.stock || product.stock) === 0}
                    className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>

                  {/* Buy Now */}
                  <button
                    onClick={handleBuyNow}
                    disabled={(selectedVariant?.stock || product.stock) === 0}
                    className="flex-1 px-6 py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 active:scale-[0.98] transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    💳 Buy Now
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className="flex gap-3">
                  {settings?.system.enableWishlist !== false && (
                    <button
                      onClick={handleWishlist}
                      className={`flex-1 px-4 py-3 border rounded-lg transition-all hover:scale-105 active:scale-95 ${
                        inWishlist
                          ? "border-accent bg-accent/10 text-accent-foreground"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Heart className="w-5 h-5" fill={inWishlist ? "currentColor" : "none"} />
                        <span className="font-medium">
                          {inWishlist ? "In Wishlist" : "Add to Wishlist"}
                        </span>
                      </div>
                    </button>
                  )}
                  <button
                    className="px-4 py-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all hover:scale-105 active:scale-95"
                    title="Share Product"
                    aria-label="Share product"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Social Proof on CTA */}
                {product.reviewCount > 0 && (
                  <p className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      {Math.floor(product.reviewCount * 1.5)}
                    </span> people added this to their cart today
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Details Accordion */}
          <div className="mb-10 bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Product Details</h2>
            <ProductDetailsAccordion 
              key={product.id}
              product={product as any} 
              defaultValue="description" 
            />
          </div>

          {/* Customer Reviews */}
          {settings?.system.enableProductReviews !== false && (
            <div className="mb-10">
              <ProductReviews product={product} />
            </div>
          )}

          {/* Product Recommendations */}
          <div className="space-y-8">
            {/* Frequently Bought Together */}
            <ProductRecommendations
              currentProduct={product}
              allProducts={products}
              type="frequently-bought"
            />
            
            {/* Similar Products */}
            <ProductRecommendations
              currentProduct={product}
              allProducts={products}
              type="similar"
            />
            
            {/* Category Bestsellers */}
            <ProductRecommendations
              currentProduct={product}
              allProducts={products}
              type="category"
            />
          </div>
        </div>
      </main>

      <Footer />

      {/* Sticky Add to Cart (Mobile Only) */}
      {product && (
        <StickyAddToCart
          product={{
            ...product,
            price: selectedVariant?.price ?? product.price,
            stock: selectedVariant?.stock ?? product.stock,
          } as any}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
          isVisible={showStickyCart}
        />
      )}

      {/* Confirmation Modal */}
      {product && selectedVariant && (
        <VariantConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmedAction}
          product={product}
          variant={selectedVariant}
          quantity={quantity}
          actionType={modalActionType}
        />
      )}
    </div>
  );
}
