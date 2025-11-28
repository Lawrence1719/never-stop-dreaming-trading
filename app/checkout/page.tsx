"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSummary } from "@/components/ecommerce/cart-summary";
import { CheckoutStepper } from "@/components/ecommerce/checkout-stepper";
import { useCart } from "@/lib/context/cart-context";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { Product } from "@/lib/types";
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

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { toasts, addToast, removeToast } = useToast();
  const { settings } = useSettings();

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
    shippingMethod: "standard",
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

  const steps = ["Shipping", "Payment", "Review"];

  // TODO: Replace with actual API call to fetch products from Supabase
  // const { data: products } = await supabase.from('products').select('*').in('id', cart.items.map(i => i.productId));
  const products: Product[] = [];

  // Calculate shipping cost based on selected method and settings
  const calculateShippingCost = () => {
    if (!settings) return 10; // Default fallback
    
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const freeThreshold = parseFloat(settings.shipping.freeShippingThreshold || '50.00');
    
    // Free shipping if subtotal exceeds threshold
    if (subtotal >= freeThreshold) {
      return 0;
    }
    
    if (formData.shippingMethod === "standard") {
      return parseFloat(settings.shipping.standardRate || '5.00');
    } else if (formData.shippingMethod === "express") {
      return parseFloat(settings.shipping.expressRate || '15.00');
    }
    return 0;
  };

  // Build product objects for the checkout summary. If we have full product
  // data (from a server fetch) use that, otherwise synthesize a minimal Product
  // object from the cart item's stored details so the checkout can render.
  const cartProducts = cart.items.map((item) => {
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

  // If user has items in cart but is not authenticated, require login before checkout
  if (cart.items.length > 0 && !user) {
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
      addToast("Please fix the errors above", "error");
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      addToast("Please sign in to complete the purchase", "info");
      // send user to login and return to checkout after auth
      router.push(`/login?next=/checkout`);
      return;
    }

    if (!validateStep()) {
      addToast("Please fix the errors above", "error");
      return;
    }

    try {
      let shippingAddressId: string | null = selectedAddressId;

      if (user) {
        // If user chose to save as default or didn't select an existing address,
        // create a new address record and mark it default if requested.
        if (!shippingAddressId || saveAsDefault) {
          setIsSavingAddress(true);

          // If saving as default, unset existing defaults first
          if (saveAsDefault) {
            await supabase
              .from('addresses')
              .update({ is_default: false })
              .eq('user_id', user.id);
          }

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
              is_default: saveAsDefault,
            })
            .select()
            .single();

          setIsSavingAddress(false);

          if (createErr) throw createErr;
          shippingAddressId = created.id;
        }
      }

      // Prepare order data
      const subtotal = cart.total;
      const shippingCost = calculateShippingCost();
      const orderTotal = subtotal + shippingCost;

      // Format cart items for database
      const orderItems = cart.items.map((item) => ({
        product_id: item.productId,
        name: item.name || 'Product',
        quantity: item.quantity,
        price: item.price || 0,
        image: item.image || '/placeholder.svg',
      }));

      // Format shipping address for database
      const shippingAddressData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        street_address: formData.street,
        city: formData.city,
        province: formData.province,
        zip_code: formData.zip,
        shipping_method: formData.shippingMethod, // Store shipping method
      };

      // Determine order status based on payment method
      // For COD, status is 'pending', for card it's 'paid'
      const orderStatus = formData.paymentMethod === 'cod' ? 'pending' : 'paid';

      // Create order in database
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: orderStatus,
          total: orderTotal,
          items: orderItems,
          shipping_address: shippingAddressData,
          payment_method: formData.paymentMethod,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Failed to create order', orderError);
        throw new Error('Failed to create order. Please try again.');
      }

      const orderId = createdOrder.id;
      clearCart();
      addToast("Order placed successfully", "success");
      router.push(`/order-confirmation/${orderId}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create address/order', err);
      addToast('Failed to save address. Please try again.', 'error');
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
                            if (!id) return;
                            const a = addresses.find((ad) => ad.id === id);
                            if (a) {
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
                        className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.fullName && touched.fullName ? "border-destructive" : "border-border"
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
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.email ? "border-destructive" : "border-border"
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
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.phone && touched.phone ? "border-destructive" : "border-border"
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
                        className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.street && touched.street ? "border-destructive" : "border-border"
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
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.province && touched.province ? "border-destructive" : "border-border"
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
                            className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                              errors.city && touched.city ? "border-destructive" : "border-border"
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
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.zip && touched.zip ? "border-destructive" : "border-border"
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

                    <div>
                      <label className="block text-sm font-medium mb-1">Shipping Method</label>
                      <select
                        name="shippingMethod"
                        value={formData.shippingMethod}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {(() => {
                          const subtotal = cart.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
                          const freeThreshold = settings ? parseFloat(settings.shipping.freeShippingThreshold || '50.00') : 50;
                          const standardRate = settings ? parseFloat(settings.shipping.standardRate || '5.00') : 5;
                          const expressRate = settings ? parseFloat(settings.shipping.expressRate || '15.00') : 15;
                          const isFreeShipping = subtotal >= freeThreshold;
                          
                          return (
                            <>
                              <option value="standard">
                                Standard (5-7 business days) - {isFreeShipping ? 'FREE' : `₱${standardRate.toFixed(2)}`}
                              </option>
                              <option value="express">
                                Express (2-3 business days) - {isFreeShipping ? 'FREE' : `₱${expressRate.toFixed(2)}`}
                              </option>
                            </>
                          );
                        })()}
                      </select>
                    </div>
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
                            className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                              errors.cardNumber ? "border-destructive" : "border-border"
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
                              className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                                errors.cardExpiry ? "border-destructive" : "border-border"
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
                              className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                                errors.cardCvc ? "border-destructive" : "border-border"
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
                            <span>₱{(product.price * quantity).toFixed(2)}</span>
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
                        {formData.shippingMethod === "standard" && `Standard (5-7 business days) - ${calculateShippingCost() === 0 ? 'FREE' : `₱${calculateShippingCost().toFixed(2)}`}`}
                        {formData.shippingMethod === "express" && `Express (2-3 business days) - ${calculateShippingCost() === 0 ? 'FREE' : `₱${calculateShippingCost().toFixed(2)}`}`}
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
                      className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Place Order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1 h-fit">
              <CartSummary 
                subtotal={cart.total} 
                shipping={calculateShippingCost()}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
