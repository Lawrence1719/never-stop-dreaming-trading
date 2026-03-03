"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSummary } from "@/components/ecommerce/cart-summary";
import { ShippingOptions } from "@/components/ecommerce/shipping-options";
import { CheckoutStepper } from "@/components/ecommerce/checkout-stepper";
import { useCart } from "@/lib/context/cart-context";
import { useAuth } from "@/lib/context/auth-context";
import { useShipping } from "@/lib/context/shipping-context";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { Product, CartItem } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import {
  validateEmail,
  validatePhoneNumber,
  validateZipCode,
  validateStreetAddress,
  validateCity,
  validateProvince,
  validateFullName,
  validateZipCodeForLocation
} from "@/lib/utils/validation";
import {
  getProvinces,
  getCitiesByProvince,
  getZipCodesForCity
} from "@/lib/data/philippines-addresses";
import { ChevronLeft } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { shippingMethod, setShippingMethod, calculateShipping } = useShipping();
  const { toast } = useToast();
  const { settings } = useSettings();

  // Handle "Buy Now" flow with query parameters
  const buyNowProductId = searchParams.get('product');
  const buyNowQuantity = parseInt(searchParams.get('quantity') || '1', 10);
  const buyNowVariantId = searchParams.get('variant');
  const [buyNowCart, setBuyNowCart] = useState<CartItem[] | null>(null);
  const [isLoadingBuyNow, setIsLoadingBuyNow] = useState(!!buyNowProductId);

  // Fetch product details for Buy Now flow
  useEffect(() => {
    if (!buyNowProductId) {
      setIsLoadingBuyNow(false);
      return;
    }

    const fetchBuyNowProduct = async () => {
      try {
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
            )
          `)
          .eq('id', buyNowProductId)
          .single();

        if (error) throw error;

        if (data) {
          // Find the variant if specified, otherwise use the first active one
          let selectedVariant = null;
          if (buyNowVariantId) {
            selectedVariant = data.product_variants?.find((v: any) => v.id === buyNowVariantId && v.is_active);
          } else if (data.product_variants?.length > 0) {
            selectedVariant = data.product_variants.find((v: any) => v.is_active);
          }

          const price = selectedVariant?.price ?? Number(data.price) ?? 0;
          const cartItem: CartItem = {
            productId: data.id,
            variantId: selectedVariant?.id || "",
            quantity: buyNowQuantity,
            name: data.name,
            price,
            image: data.image_url || data.images?.[0] || "",
            variantLabel: selectedVariant?.variant_label || "",
            sku: selectedVariant?.sku || data.sku || "",
          };

          setBuyNowCart([cartItem]);
          console.debug('[Checkout] Buy Now cart created:', cartItem);
        }
      } catch (err) {
        console.error('Failed to load Buy Now product:', err);
        toast({
          title: "Error",
          description: "Failed to load product. Please go back and try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingBuyNow(false);
      }
    };

    fetchBuyNowProduct();
  }, [buyNowProductId, buyNowQuantity, buyNowVariantId, toast]);

  // Use either Buy Now cart or regular cart
  const checkoutCart = buyNowCart !== null ? buyNowCart : cart.items;
  const isBuyNow = buyNowCart !== null;

  const [step, setStep] = useState(0);
  // Initialize payment method based on available options
  const getInitialPaymentMethod = () => {
    if (!settings) return "card";
    if (settings.payment.creditCard) return "card";
    if (settings.payment.cashOnDelivery) return "cod";
    if (settings.payment.bankTransfer) return "bank";
    return "card";
  };

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    street: "",
    city: "",
    province: "",
    zip: "",
    paymentMethod: getInitialPaymentMethod(),
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [provinces] = useState<string[]>(getProvinces());
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const steps = ["Shipping", "Payment", "Review"];

  // TODO: Replace with actual API call to fetch products from Supabase
  // const { data: products } = await supabase.from('products').select('*').in('id', checkoutCart.map(i => i.productId));
  const products: Product[] = [];

  // Calculate checkout totals
  const checkoutTotal = checkoutCart.reduce((sum, item) => sum + ((item.price ?? 0) * item.quantity), 0);

  // Calculate shipping cost based on selected method and settings
  const shippingCost = calculateShipping(checkoutTotal);

  // Build product objects for the checkout summary. If we have full product
  // data (from a server fetch) use that, otherwise synthesize a minimal Product
  // object from the cart item's stored details so the checkout can render.
  const cartProducts = checkoutCart.map((item) => {
    const full = products.find((p) => p.id === item.productId);
    if (full) return { product: full, quantity: item.quantity };

    const synthesized: Product = {
      id: item.productId,
      name: item.name || "Product",
      slug: item.productId,
      description: "",
      price: item.price ?? 0,
      compareAtPrice: undefined,
      images: item.image ? [item.image] : ["/placeholder.svg"],
      category: "",
      stock: item.quantity,
      sku: "",
      rating: 0,
      reviewCount: 0,
      featured: false,
      specifications: {},
      iot: undefined,
    };

    return { product: synthesized, quantity: item.quantity };
  });



  // Real-time validation for individual fields
  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "fullName":
        const nameValidation = validateFullName(value);
        if (!nameValidation.valid) {
          error = nameValidation.error || "Full name is required";
        }
        break;
      case "email":
        if (!value.trim()) {
          error = "Email is required";
        } else if (!validateEmail(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "phone":
        if (!value.trim()) {
          error = "Phone number is required";
        } else if (!validatePhoneNumber(value)) {
          error = "Please enter a valid Philippine phone number (e.g., 0912 345 6789)";
        }
        break;
      case "street":
        const streetValidation = validateStreetAddress(value);
        if (!streetValidation.valid) {
          error = streetValidation.error || "Street address is required";
        }
        break;
      case "city":
        const cityValidation = validateCity(value);
        if (!cityValidation.valid) {
          error = cityValidation.error || "City is required";
        }
        break;
      case "province":
        const provinceValidation = validateProvince(value);
        if (!provinceValidation.valid) {
          error = provinceValidation.error || "Province is required";
        }
        break;
      case "zip":
        const zipValidation = validateZipCodeForLocation(value, formData.city, formData.province);
        if (!zipValidation.valid) {
          error = zipValidation.error || "Valid zip code is required";
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      // Validate all shipping fields
      const fields = ["fullName", "email", "phone", "street", "city", "province", "zip"];
      fields.forEach((field) => {
        const value = formData[field as keyof typeof formData] as string;
        validateField(field, value);
        const error = errors[field] || "";
        if (error) newErrors[field] = error;
      });
    } else if (step === 1) {
      if (formData.paymentMethod === "card") {
        if (formData.cardNumber.replace(/\s/g, "").length !== 16)
          newErrors.cardNumber = "Valid card number required";
        if (!/^\d{2}\/\d{2}$/.test(formData.cardExpiry))
          newErrors.cardExpiry = "Valid expiry (MM/YY) required";
        if (formData.cardCvc.length !== 3) newErrors.cardCvc = "Valid CVC required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch user's addresses when available
  useEffect(() => {
    let mounted = true;
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!mounted) return;
        setAddresses(data || []);
        const def = (data || []).find((a: any) => a.is_default);
        if (def) {
          setSelectedAddressId(def.id);
          setFormData((prev) => ({
            ...prev,
            fullName: def.full_name,
            email: def.email,
            phone: def.phone,
            street: def.street_address,
            city: def.city,
            province: def.province,
            zip: def.zip_code,
          }));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch addresses', err);
      }
    };

    fetchAddresses();
    return () => { mounted = false; };
  }, [user]);

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    } else {
      toast({
        title: "Validation Error",
        description: "Please fix the errors above",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  // Generate unique idempotency key for this order attempt
  const generateIdempotencyKey = () => {
    if (!user) return null;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${user.id}-${timestamp}-${random}`;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete the purchase",
      });
      // send user to login and return to checkout after auth
      router.push(`/login?next=/checkout`);
      return;
    }

    if (!validateStep()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors above",
        variant: "destructive",
      });
      return;
    }

    // Prevent double-submission
    if (isProcessingOrder) {
      toast({
        title: "Processing",
        description: "Order is already being processed. Please wait...",
      });
      return;
    }

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey();
    if (!idempotencyKey) {
      toast({
        title: "Error",
        description: "Unable to generate order key. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingOrder(true);

    try {
      // Debug log: Check form data before processing
      console.log('Processing order with formData:', formData);

      let shippingAddressId: string | null = selectedAddressId;

      if (user) {
        // If user didn't select an existing address, create a new address record
        if (!shippingAddressId) {
          setIsSavingAddress(true);

          try {
            // If saving as default, unset existing defaults first
            if (saveAsDefault) {
              await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', user.id);
            }

            // Log the data being inserted for debugging
            console.log('Creating new address with data:', {
              user_id: user.id,
              full_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              street_address: formData.street,
              city: formData.city,
              province: formData.province,
              zip_code: formData.zip,
              address_type: 'shipping',
              is_default: saveAsDefault,
            });

            const { data: created, error: createErr } = await supabase
              .from('addresses')
              .insert({
                user_id: user.id,
                full_name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                street_address: formData.street,
                city: formData.city,
                province: formData.province,
                zip_code: formData.zip,
                address_type: 'shipping',
                is_default: saveAsDefault,
              })
              .select()
              .single();

            console.log('Address creation result:', { created, error: createErr });

            if (createErr) {
              console.error('Failed to create address', createErr);
              throw new Error('Failed to create address. Please try again.');
            }
            shippingAddressId = created.id;
          } finally {
            setIsSavingAddress(false);
          }
        } else if (shippingAddressId) {
          // User selected an existing address. Update its default status if saveAsDefault changed
          const selectedAddress = addresses.find((a) => a.id === shippingAddressId);
          if (selectedAddress && selectedAddress.is_default !== saveAsDefault) {
            console.log('Updating address default status:', {
              address_id: shippingAddressId,
              is_default: saveAsDefault,
            });

            // If setting this address as default, unset others first
            if (saveAsDefault) {
              await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', user.id)
                .neq('id', shippingAddressId);
            }

            // Update this address's default status
            const { error: updateErr } = await supabase
              .from('addresses')
              .update({ is_default: saveAsDefault })
              .eq('id', shippingAddressId);

            if (updateErr) {
              console.error('Failed to update address default status', updateErr);
              throw new Error('Failed to update address. Please try again.');
            }
          }
        }
      }

      // Prepare order data
      const subtotal = checkoutTotal;
      const shipping = shippingCost;
      const orderTotal = subtotal + shipping;

      // Format cart items for database
      const orderItems = checkoutCart.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId, // <--- Add variant_id to support RPC deduction
        name: item.name || 'Product',
        quantity: item.quantity,
        price: item.price || 0,
        image: item.image || '/placeholder.svg',
      }));

      // Ensure we have a shipping_address_id
      if (!shippingAddressId) {
        throw new Error('Shipping address ID is required');
      }

      // Determine order status based on payment method
      // For COD, status is 'pending', for card it's 'paid'
      const orderStatus = formData.paymentMethod === 'cod' ? 'pending' : 'paid';

      // Create order via API endpoint with idempotency key
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          user_id: user.id,
          status: orderStatus,
          total: orderTotal,
          items: orderItems,
          shipping_address_id: shippingAddressId,
          shipping_method: shippingMethod,
          shipping_cost: shipping,
          payment_method: formData.paymentMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order. Please try again.');
      }

      // Check if this was a duplicate (idempotency returned existing order)
      if (result.duplicate) {
        toast({
          title: "Order Already Processed",
          description: "Redirecting to confirmation...",
        });
      } else {
        toast({
          title: "Success",
          description: "Order placed successfully",
        });
      }

      const orderId = result.data.id;
      // Only clear cart if not using Buy Now flow (Buy Now uses temporary cart)
      if (!isBuyNow) {
        clearCart();
      }
      router.push(`/order-confirmation/${orderId}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create address/order', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save address. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingOrder(false); // Make sure order processing always resets
    }
  };

  // Update available cities when province changes
  useEffect(() => {
    if (formData.province) {
      const cities = getCitiesByProvince(formData.province);
      setAvailableCities(cities.map(c => c.name));

      // If current city is not in the new province's cities, clear it
      if (formData.city && !cities.some(c => c.name.toLowerCase() === formData.city.toLowerCase())) {
        setFormData((prev) => ({ ...prev, city: "", zip: "" }));
      }
    } else {
      setAvailableCities([]);
    }
  }, [formData.province]);

  // Update zip code suggestions when city changes
  useEffect(() => {
    if (formData.city && formData.province && formData.zip) {
      validateField("zip", formData.zip);
    }
  }, [formData.city, formData.province]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Debug logging for street address
    if (name === 'street') {
      console.log('Street address changed:', value);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Mark field as touched
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Real-time validation for shipping fields (debounced for text inputs)
    if (step === 0 && ["fullName", "email", "phone", "street", "city", "province", "zip"].includes(name)) {
      // Immediate validation for zip, phone, and selects
      if (name === "zip" || name === "phone" || name === "province" || name === "city") {
        validateField(name, value);
      } else {
        // Debounced validation for text fields
        setTimeout(() => {
          validateField(name, value);
        }, 500);
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (step === 0 && ["fullName", "email", "phone", "street", "city", "province", "zip"].includes(name)) {
      validateField(name, value);
    }
  };

  // If user has items in cart but is not authenticated, require login before checkout
  if (checkoutCart.length > 0 && !user && !isLoadingBuyNow) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to continue</h1>
            <p className="text-muted-foreground mb-6">You need to be logged in or create an account to complete your purchase.</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/login?next=/checkout"
                className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Sign in
              </Link>

              <Link
                href="/register?next=/checkout"
                className="inline-block px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-semibold"
              >
                Create account
              </Link>
            </div>
            <div className="mt-8">
              <Link href="/products" className="text-sm text-muted-foreground hover:underline">Continue shopping</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartProducts.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-2">Checkout not available</h1>
            <p className="text-muted-foreground mb-8">Your cart is empty.</p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <CheckoutStepper steps={steps} currentStep={step} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                {/* Shipping Step */}
                {step === 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Shipping Information</h2>

                    {/* Saved Addresses Dropdown */}
                    {user && addresses.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Saved Addresses</label>
                        <select
                          className="w-full px-4 py-2 bg-input border border-border rounded-md"
                          value={selectedAddressId || ""}
                          onChange={(e) => {
                            const id = e.target.value || null;
                            setSelectedAddressId(id);
                            if (!id) {
                              // When deselecting, reset saveAsDefault to true for new address
                              setSaveAsDefault(true);
                              return;
                            }
                            const a = addresses.find((ad) => ad.id === id);
                            if (a) {
                              // Update form data with selected address
                              setFormData((prev) => ({
                                ...prev,
                                fullName: a.full_name,
                                email: a.email,
                                phone: a.phone,
                                street: a.street_address,
                                city: a.city,
                                province: a.province,
                                zip: a.zip_code,
                              }));
                              // Set saveAsDefault based on whether this address is the default
                              setSaveAsDefault(a.is_default || false);
                            }
                          }}
                        >
                          <option value="">Use different address</option>
                          {addresses.map((a) => (
                            <option key={a.id} value={a.id}>{a.full_name} — {a.street_address}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Full Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Juan Dela Cruz"
                        className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.fullName && touched.fullName ? "border-destructive" : "border-border"
                          }`}
                      />
                      {errors.fullName && touched.fullName && (
                        <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.email ? "border-destructive" : "border-border"
                            }`}
                        />
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Phone <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="0912 345 6789"
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.phone && touched.phone ? "border-destructive" : "border-border"
                            }`}
                        />
                        {errors.phone && touched.phone && (
                          <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                        )}
                        {!errors.phone && touched.phone && formData.phone && (
                          <p className="text-xs text-muted-foreground mt-1">✓ Valid Philippine phone number</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Street Address <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="e.g., 123 Main Street, Barangay Name"
                        className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.street && touched.street ? "border-destructive" : "border-border"
                          }`}
                      />
                      {errors.street && touched.street && (
                        <p className="text-xs text-destructive mt-1">{errors.street}</p>
                      )}
                      {!errors.street && touched.street && (
                        <p className="text-xs text-muted-foreground mt-1">✓ Valid address format</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Province <span className="text-destructive">*</span>
                        </label>
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.province && touched.province ? "border-destructive" : "border-border"
                            }`}
                        >
                          <option value="">Select Province</option>
                          {provinces.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                        {errors.province && touched.province && (
                          <p className="text-xs text-destructive mt-1">{errors.province}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          City <span className="text-destructive">*</span>
                        </label>
                        {formData.province ? (
                          <select
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            disabled={!formData.province}
                            className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.city && touched.city ? "border-destructive" : "border-border"
                              } ${!formData.province ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <option value="">Select City</option>
                            {availableCities.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="Select province first"
                            disabled
                            className="w-full px-4 py-2 bg-input border border-border rounded-md opacity-50 cursor-not-allowed"
                          />
                        )}
                        {errors.city && touched.city && (
                          <p className="text-xs text-destructive mt-1">{errors.city}</p>
                        )}
                        {formData.city && formData.province && !errors.city && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Valid zip codes: {getZipCodesForCity(formData.city, formData.province).slice(0, 3).join(", ")}
                            {getZipCodesForCity(formData.city, formData.province).length > 3 && "..."}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Zip Code <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          name="zip"
                          value={formData.zip}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="1630"
                          maxLength={4}
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.zip && touched.zip ? "border-destructive" : "border-border"
                            }`}
                        />
                        {errors.zip && touched.zip && (
                          <p className="text-xs text-destructive mt-1">{errors.zip}</p>
                        )}
                        {!errors.zip && touched.zip && formData.zip && (
                          <p className="text-xs text-muted-foreground mt-1">✓ Valid zip code</p>
                        )}
                      </div>
                    </div>

                    {/* Save as default address (only for logged-in users) */}
                    {user && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          id="saveAsDefault"
                          type="checkbox"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="saveAsDefault" className="text-sm">Save as default address</label>
                      </div>
                    )}

                    {/* Shipping Method Selection */}
                    <ShippingOptions subtotal={checkoutTotal} />
                  </div>
                )}

                {/* Payment Step */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Payment Method</h2>

                    <div className="space-y-3">
                      {settings?.payment.creditCard && (
                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/10 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="card"
                            checked={formData.paymentMethod === "card"}
                            onChange={handleInputChange}
                          />
                          <span className="font-medium">Credit/Debit Card</span>
                        </label>
                      )}

                      {settings?.payment.cashOnDelivery && (
                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/10 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cod"
                            checked={formData.paymentMethod === "cod"}
                            onChange={handleInputChange}
                          />
                          <span className="font-medium">Cash on Delivery</span>
                        </label>
                      )}

                      {settings?.payment.bankTransfer && (
                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/10 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="bank"
                            checked={formData.paymentMethod === "bank"}
                            onChange={handleInputChange}
                          />
                          <span className="font-medium">Bank Transfer</span>
                        </label>
                      )}
                    </div>

                    {formData.paymentMethod === "card" && (
                      <div className="pt-4 border-t border-border space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Card Number</label>
                          <input
                            type="text"
                            name="cardNumber"
                            placeholder="4242 4242 4242 4242"
                            value={formData.cardNumber}
                            onChange={handleInputChange}
                            maxLength={19}
                            className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.cardNumber ? "border-destructive" : "border-border"
                              }`}
                          />
                          {errors.cardNumber && <p className="text-xs text-destructive mt-1">{errors.cardNumber}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Expiry Date</label>
                            <input
                              type="text"
                              name="cardExpiry"
                              placeholder="MM/YY"
                              value={formData.cardExpiry}
                              onChange={handleInputChange}
                              maxLength={5}
                              className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.cardExpiry ? "border-destructive" : "border-border"
                                }`}
                            />
                            {errors.cardExpiry && <p className="text-xs text-destructive mt-1">{errors.cardExpiry}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">CVC</label>
                            <input
                              type="text"
                              name="cardCvc"
                              placeholder="123"
                              value={formData.cardCvc}
                              onChange={handleInputChange}
                              maxLength={3}
                              className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${errors.cardCvc ? "border-destructive" : "border-border"
                                }`}
                            />
                            {errors.cardCvc && <p className="text-xs text-destructive mt-1">{errors.cardCvc}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Review Step */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Order Summary</h3>
                      <div className="space-y-2 border-b border-border pb-4">
                        {cartProducts.map(({ product, quantity }) => (
                          <div key={product.id} className="flex justify-between text-sm">
                            <span>{product.name} x {quantity}</span>
                            <span>{formatPrice((product.price ?? 0) * quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-border rounded-lg p-4 bg-secondary/10">
                      <h3 className="font-semibold mb-3">Shipping Address</h3>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{formData.fullName}</p>
                        <p className="text-muted-foreground">{formData.street}</p>
                        <p className="text-muted-foreground">
                          {formData.city}, {formData.province} {formData.zip}
                        </p>
                        <p className="text-muted-foreground mt-2">
                          <span className="font-medium">Phone:</span> {formData.phone}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium">Email:</span> {formData.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="mt-3 text-sm text-primary hover:underline"
                      >
                        Edit Address
                      </button>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Shipping Method</h3>
                      <p className="text-sm text-muted-foreground">
                        {shippingMethod === "standard" && `Standard (5-7 business days) - ${shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}`}
                        {shippingMethod === "express" && `Express (2-3 business days) - ${shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}`}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Payment Method</h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.paymentMethod === "card" && "Credit/Debit Card"}
                        {formData.paymentMethod === "cod" && "Cash on Delivery"}
                        {formData.paymentMethod === "bank" && "Bank Transfer"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6 border-t border-border mt-6">
                  {step > 0 && (
                    <button
                      onClick={handlePrevious}
                      className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
                    >
                      Previous
                    </button>
                  )}

                  {step < steps.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isProcessingOrder}
                      className={`flex-1 px-6 py-2 rounded-lg transition-colors font-medium ${isProcessingOrder
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                      {isProcessingOrder ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing Order...
                        </span>
                      ) : (
                        'Place Order'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1 h-fit">
              <CartSummary
                subtotal={checkoutTotal}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Loading Overlay - Prevents interaction during order processing */}
      {isProcessingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <h3 className="text-lg font-semibold mb-2">Processing Your Order</h3>
                <p className="text-sm text-muted-foreground">
                  Please do not close or refresh this page.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This may take a few seconds...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading checkout...</p>
          </div>
        </div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
