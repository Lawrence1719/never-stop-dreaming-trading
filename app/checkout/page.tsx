"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSummary } from "@/components/ecommerce/cart-summary";
import { CheckoutStepper } from "@/components/ecommerce/checkout-stepper";
import { useCart } from "@/lib/context/cart-context";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { Product } from "@/lib/types";
import { validateEmail, validatePhoneNumber, validateZipCode } from "@/lib/utils/validation";
import { ChevronLeft } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { toasts, addToast, removeToast } = useToast();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    street: "",
    city: "",
    province: "",
    zip: "",
    shippingMethod: "standard",
    paymentMethod: "card",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = ["Shipping", "Payment", "Review"];

  // TODO: Replace with actual API call to fetch products from Supabase
  // const { data: products } = await supabase.from('products').select('*').in('id', cart.items.map(i => i.productId));
  const products: Product[] = [];

  const cartProducts = cart.items
    .map((item) => ({
      product: products.find((p) => p.id === item.productId)!,
      quantity: item.quantity,
    }))
    .filter((item) => item.product);

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name required";
      if (!validateEmail(formData.email)) newErrors.email = "Valid email required";
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!validatePhoneNumber(formData.phone)) {
        newErrors.phone = "Please enter a valid Philippine phone number (e.g., 0912 345 6789)";
      }
      if (!formData.street.trim()) newErrors.street = "Street address required";
      if (!formData.city.trim()) newErrors.city = "City required";
      if (!formData.province.trim()) newErrors.province = "Province required";
      if (!validateZipCode(formData.zip)) newErrors.zip = "Valid zip code required";
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
    if (validateStep()) {
      const orderId = "ord-" + Math.random().toString(36).substr(2, 9);
      clearCart();
      addToast("Order placed successfully", "success");
      router.push(`/order-confirmation/${orderId}`);
    } else {
      addToast("Please fix the errors above", "error");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
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

                    <div>
                      <label className="block text-sm font-medium mb-1">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.fullName ? "border-destructive" : "border-border"
                        }`}
                      />
                      {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
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
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="0912 345 6789"
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.phone ? "border-destructive" : "border-border"
                          }`}
                        />
                        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Street Address</label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.street ? "border-destructive" : "border-border"
                        }`}
                      />
                      {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.city ? "border-destructive" : "border-border"
                          }`}
                        />
                        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Province</label>
                        <input
                          type="text"
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.province ? "border-destructive" : "border-border"
                          }`}
                        />
                        {errors.province && <p className="text-xs text-destructive mt-1">{errors.province}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Zip Code</label>
                        <input
                          type="text"
                          name="zip"
                          value={formData.zip}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors.zip ? "border-destructive" : "border-border"
                          }`}
                        />
                        {errors.zip && <p className="text-xs text-destructive mt-1">{errors.zip}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Shipping Method</label>
                      <select
                        name="shippingMethod"
                        value={formData.shippingMethod}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="standard">Standard (5-7 business days) - $10</option>
                        <option value="express">Express (2-3 business days) - $25</option>
                        <option value="overnight">Overnight - $50</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Payment Step */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Payment Method</h2>

                    <div className="space-y-3">
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
                            <span>${(product.price * quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Shipping Address</h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.fullName}<br />
                        {formData.street}<br />
                        {formData.city}, {formData.province} {formData.zip}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Shipping Method</h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.shippingMethod === "standard" && "Standard (5-7 business days)"}
                        {formData.shippingMethod === "express" && "Express (2-3 business days)"}
                        {formData.shippingMethod === "overnight" && "Overnight"}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Payment Method</h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.paymentMethod === "card" && "Credit/Debit Card"}
                        {formData.paymentMethod === "cod" && "Cash on Delivery"}
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
              <CartSummary subtotal={cart.total} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
