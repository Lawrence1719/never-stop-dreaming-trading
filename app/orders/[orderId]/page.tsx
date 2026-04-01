"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { 
  ChevronLeft, Download, CheckCircle, Clock, Star, 
  AlertCircle, Phone, Truck, CreditCard, Wallet, 
  Store, ShoppingCart, ArrowRight, XCircle 
} from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RatingModal } from "@/components/orders/RatingModal";
import { ProductImage } from "@/components/shared/ProductImage";
import { useCart } from "@/lib/context/cart-context";
import { generateInvoicePDF } from "@/lib/utils/invoice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Payment Method Labels mapping
const paymentLabels: Record<string, { label: string, icon: any }> = {
  cod: { label: "Cash on Delivery", icon: Store },
  gcash: { label: "GCash", icon: Wallet },
  card: { label: "Credit / Debit Card", icon: CreditCard },
};

// Status Timeline Configuration
const STEPS = [
  { id: 'placed', label: 'Order Placed', icon: ShoppingCart },
  { id: 'processing', label: 'Processing', icon: Clock },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const getStatusStep = (status: string) => {
  if (status === 'pending') return 0;
  if (['processing', 'paid'].includes(status)) return 1;
  if (status === 'shipped') return 2;
  if (['delivered', 'completed'].includes(status)) return 3;
  return -1; // Cancelled or other
};

const statusBannerColors: Record<string, string> = {
  pending: "border-blue-500",
  processing: "border-purple-500",
  shipped: "border-amber-500",
  delivered: "border-emerald-500",
  completed: "border-emerald-500",
  cancelled: "border-rose-500",
};

const CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery takes too long",
  "Incorrect shipping address",
  "Duplicate order",
  "Other"
];

export default function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const { orderId } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const { addItem } = useCart();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelNote, setCancelNote] = useState<string>("");
  const [isOrderingAgain, setIsOrderingAgain] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!user || !orderId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthorized');

      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch order');

      const { data: orders } = await response.json();
      const foundOrder = orders?.find((o: Order) => o.id === orderId);
      
      if (!foundOrder) {
        setError('Order not found');
      } else {
        setOrder(foundOrder);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load order information.');
    } finally {
      setIsLoading(false);
    }
  }, [user, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleRatingSuccess = (rating: number, reviewText: string) => {
    setOrder(prev => prev ? { ...prev, hasRated: true, rating, reviewText, ratedAt: new Date().toISOString() } : null);
  };

  const handleOrderAgain = async () => {
    if (!order) return;
    try {
      setIsOrderingAgain(true);
      for (const item of order.items) {
        await addItem(item.productId || "", item.quantity, item.variantId ? { id: item.variantId } as any : undefined);
      }
      toast({ 
        title: "Added to Cart", 
        description: "Items from this order have been added back to your cart.",
        variant: "success"
      });
      router.push('/cart');
    } catch (err) {
      toast({ title: "Error", description: "Failed to add items to cart." });
    } finally {
      setIsOrderingAgain(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!order || isConfirming) return;
    setIsConfirming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!response.ok) throw new Error('Failed to confirm receipt');
      toast({ title: "Receipt Confirmed", variant: "success" });
      fetchOrder();
    } catch (err) {
      toast({ title: "Error", description: "Confirmation failed.", variant: "destructive" });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || isCancelling) return;
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reason: cancelReason, 
          note: cancelNote 
        })
      });
      if (!response.ok) throw new Error('Failed to cancel order');
      toast({ title: "Order Cancelled", variant: "success" });
      router.push('/orders');
    } catch (err) {
      toast({ title: "Error", description: "Cancellation failed.", variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Clock className="w-8 h-8 animate-spin text-primary/20" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-32 text-center">
            <h1 className="text-4xl font-black mb-4 tracking-tighter">{error || 'Order not found'}</h1>
            <Link href="/orders" className="text-primary font-bold hover:underline">
              Back to My Orders
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);
  const isCancelled = order.status === 'cancelled';
  const payment = paymentLabels[order.paymentMethod] || { label: order.paymentMethod.toUpperCase(), icon: CreditCard };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 pb-20 pt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8 space-y-6">
            <Link 
              href="/orders"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Orders
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
                  Order <span className="text-primary">{order.orderNumber}</span>
                </h1>
                <p className="text-muted-foreground font-medium text-sm">
                  Placed on {formatDate(order.date)}
                </p>
              </div>
              <div className="flex gap-3">
                <Badge 
                  variant="outline" 
                  className={cn("px-4 py-1.5 rounded-full border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2", 
                    order.status === 'delivered' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    order.status === 'cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", 
                    order.status === 'delivered' ? "bg-emerald-500" :
                    order.status === 'cancelled' ? "bg-rose-500" :
                    "bg-blue-500"
                  )} />
                  {order.status.toUpperCase()}
                </Badge>
                <button 
                  onClick={() => generateInvoicePDF(order)}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted font-bold text-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  Invoice
                </button>
              </div>
            </div>

            {/* Fix 1: Order Progress Stepper */}
            {!isCancelled && (
              <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-0">
                  <div className="hidden md:absolute md:block top-[19px] left-[5%] right-[5%] h-[2px] bg-muted z-0">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${currentStep === -1 ? 0 : (currentStep / 3) * 100}%` }}
                    />
                  </div>
                  
                  {STEPS.map((step, idx) => {
                    const isCompleted = currentStep >= idx;
                    const isCurrent = currentStep === idx;
                    const isPassed = currentStep > idx;
                    const Icon = step.icon;

                    return (
                      <div key={idx} className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                          isPassed || (step.id === 'delivered' && isCompleted) ? "bg-emerald-500 border-emerald-500 text-white" : 
                          isCurrent ? "bg-background border-primary text-primary shadow-lg shadow-primary/20 scale-110 ring-4 ring-primary/10" :
                          "bg-background border-muted text-muted-foreground"
                        )}>
                          {isPassed || (step.id === 'delivered' && isCompleted) ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <div className="text-left md:text-center space-y-0.5">
                          <p className={cn(
                            "text-[10px] md:text-xs font-black uppercase tracking-widest",
                            isCompleted ? "text-foreground" : "text-muted-foreground opacity-50"
                          )}>
                            {step.label}
                          </p>
                          {isCompleted && (
                            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-80">
                              {idx === 0 ? formatDate(order.date) : idx === 3 && order.deliveredAt ? formatDate(order.deliveredAt) : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Order Summary */}
            <div className="lg:col-span-8 bg-card border border-border shadow-sm rounded-3xl overflow-hidden">
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-black tracking-tight mb-8">Order Summary</h2>
                
                {/* Fix 2: Items List with Thumbnails */}
                <div className="space-y-6">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 md:gap-6 group">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border border-border/50 bg-muted/30 shrink-0">
                        <ProductImage 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          containerClassName="!p-0"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm md:text-base leading-tight uppercase truncate">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                          {item.variantLabel && (
                            <span className="text-[10px] font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{item.variantLabel}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm md:text-base">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tightened Totals */}
                <div className="mt-10 pt-8 border-t border-border/50 space-y-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">Shipping Fee</span>
                    <span className={cn(order.shipping === 0 ? "text-emerald-600" : "text-foreground")}>
                      {order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t-2 border-border/50 mt-2">
                    <span className="text-base font-black uppercase tracking-tighter">Total Price</span>
                    <span className="text-3xl font-black tracking-tighter text-foreground">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Information Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Fix 3: Delivery Info Card */}
              <div className="bg-card border border-border shadow-sm rounded-3xl p-6 md:p-8 space-y-8">
                <h3 className="text-xl font-black tracking-tight">Delivery Info</h3>
                
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">
                      {order.status === 'delivered' ? 'Delivered on' : 'Expected Delivery'}
                    </p>
                    <p className="text-lg font-black tracking-tight">
                      {formatDate(order.deliveredAt || order.date)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-2">Current Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <p className="text-base font-black tracking-tight uppercase opacity-80">{order.status}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-2">Payment Method</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                        <payment.icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-tight">{payment.label}</p>
                    </div>
                  </div>
                </div>

                {/* Track My Delivery (In sidebar) */}
                {order.trackingNumber && (
                  <div className="pt-4">
                    <Link
                      href={`/order-tracking/${order.id}`}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-2xl hover:shadow-xl hover:shadow-primary/20 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      <Truck className="w-4 h-4" />
                      Track My Delivery
                    </Link>
                  </div>
                )}
              </div>

              {/* Shipping To Card */}
              <div className="bg-muted/30 border border-border rounded-3xl p-6 md:p-8 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Shipping To</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-black text-base uppercase tracking-tight">{order.shippingAddress.fullName}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      {order.shippingAddress.street}, {order.shippingAddress.city}<br />
                      {order.shippingAddress.province}, {order.shippingAddress.zip}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/40 mb-1">Contact Number</p>
                    <p className="text-sm font-bold text-primary flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {order.shippingAddress.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fix 4 & 5: Contextual Action Buttons */}
              <div className="space-y-3">
                {['delivered', 'completed'].includes(order.status) && (
                  <div className="grid grid-cols-2 gap-3">
                    {!order.hasRated && (
                      <button
                        onClick={() => setShowRatingModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-primary text-primary rounded-2xl hover:bg-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
                      >
                        <Star className="w-4 h-4" />
                        Review
                      </button>
                    )}
                    <button
                      onClick={handleOrderAgain}
                      disabled={isOrderingAgain}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-4 bg-foreground text-background rounded-2xl hover:bg-foreground/90 transition-all font-black text-[10px] uppercase tracking-widest",
                        !order.hasRated ? "col-span-1" : "col-span-2"
                      )}
                    >
                      {isOrderingAgain ? <Clock className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Buy Again
                    </button>
                  </div>
                )}

                {['pending', 'processing', 'paid'].includes(order.status) && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full px-6 py-4 border-2 border-rose-100 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                )}

                {order.status === 'delivered' && !order.confirmedByCustomerAt && (
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={isConfirming}
                    className="w-full px-6 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20"
                  >
                    {isConfirming ? "Confirming..." : "Confirm Receipt"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {showRatingModal && (
          <RatingModal
            orderId={order.id}
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            onSuccess={handleRatingSuccess}
          />
        )}

        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 space-y-6 overflow-y-auto max-h-[90vh]">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center mx-auto shrink-0">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black tracking-tight">Cancel this order?</h3>
                <p className="text-muted-foreground font-medium text-sm">
                  Please tell us why you&apos;re cancelling order <span className="font-bold text-foreground">{order.orderNumber}</span>.
                </p>
              </div>

              <div className="space-y-4">
                <RadioGroup 
                  value={cancelReason} 
                  onValueChange={setCancelReason}
                  className="grid gap-3"
                >
                  {CANCEL_REASONS.map((reason) => (
                    <div key={reason} className="flex items-center space-x-3 bg-muted/30 hover:bg-muted/50 p-3 rounded-2xl transition-colors">
                      <RadioGroupItem value={reason} id={reason} className="border-2 border-muted-foreground/30 data-[state=checked]:border-rose-600 data-[state=checked]:text-rose-600" />
                      <Label htmlFor={reason} className="font-bold text-sm cursor-pointer flex-1">{reason}</Label>
                    </div>
                  ))}
                </RadioGroup>

                {cancelReason === "Other" && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <Textarea 
                      placeholder="Tell us more... (optional)"
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      className="rounded-2xl bg-muted/30 border-border focus:ring-rose-600 focus:border-rose-600 min-h-[100px]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelReason("");
                    setCancelNote("");
                  }}
                  className="px-4 py-4 bg-muted hover:bg-muted/80 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling || !cancelReason}
                  className={cn(
                    "px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    !cancelReason 
                      ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" 
                      : "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                  )}
                >
                  {isCancelling ? "Processing..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
