"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { 
  ChevronLeft, Download, Clock, Star, 
  AlertCircle, Phone, Truck, CreditCard, Wallet, 
  Store, ArrowRight, ImageIcon, X, History
} from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RatingModal } from "@/components/orders/RatingModal";
import { ProductImage } from "@/components/shared/ProductImage";
import { useCart } from "@/lib/context/cart-context";
import { generateInvoicePDF } from "@/lib/utils/invoice";
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

const CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery takes too long",
  "Incorrect shipping address",
  "Duplicate order",
  "Other"
];

function formatTimelineTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${datePart} at ${timePart}`;
}

function statusTimelineLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "Processing";
  if (s === "completed") return "Delivered";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusTimelineColors(status: string): { dot: string; label: string } {
  const s = status.toLowerCase();
  if (s === "pending")
    return { dot: "bg-amber-500", label: "text-amber-500" };
  if (s === "processing" || s === "paid")
    return { dot: "bg-blue-500", label: "text-blue-400" };
  if (s === "shipped")
    return { dot: "bg-cyan-500", label: "text-cyan-400" };
  if (s === "delivered" || s === "completed")
    return { dot: "bg-emerald-500", label: "text-emerald-400" };
  if (s === "cancelled")
    return { dot: "bg-red-500", label: "text-red-400" };
  return { dot: "bg-muted-foreground", label: "text-muted-foreground" };
}

function renderEntityLabel(value: string) {
  const match = value.match(/^(.*?)(\s\((?:Removed|Deleted Account)\))$/);
  if (!match) return value;

  return (
    <>
      {match[1]}
      <span className="text-muted-foreground italic">{match[2]}</span>
    </>
  );
}

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
  const [showProofModal, setShowProofModal] = useState(false);

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

  useEffect(() => {
    if (!showProofModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProofModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showProofModal]);

  // Support deep linking to review modal
  useEffect(() => {
    if (order && order.status === 'delivered' && !order.hasRated) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === 'true') {
        setShowRatingModal(true);
      }
    }
  }, [order]);

  const layout = useMemo(() => {
    if (!order) {
      return {
        hasProof: false,
        hasTrack: false,
        deliveryRow: 1,
        proofRow: null as number | null,
        trackRow: null as number | null,
        shippingRow: 2,
        summarySpan: 1,
      };
    }
    const hasProof = !!(order.proofImageUrl && ['delivered', 'completed'].includes(order.status));
    const hasTrack = !!order.trackingNumber;
    let row = 0;
    const next = () => ++row;
    const deliveryRow = next();
    const proofRow = hasProof ? next() : null;
    const trackRow = hasTrack ? next() : null;
    const shippingRow = next();
    const summarySpan = row;
    return {
      hasProof,
      hasTrack,
      deliveryRow,
      proofRow,
      trackRow,
      shippingRow,
      summarySpan,
    };
  }, [order]);

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
      const response = await fetch(`/api/orders/${orderId}/confirm-receipt`, {
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

  const payment = paymentLabels[order.paymentMethod] || { label: order.paymentMethod.toUpperCase(), icon: CreditCard };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 pb-10 pt-4 md:pt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header — order title, badge, invoice */}
          <div className="mb-4 space-y-3">
            <Link 
              href="/orders"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-semibold text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Orders
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase truncate">
                  Order <span className="text-primary">{order.orderNumber}</span>
                </h1>
                <p className="text-muted-foreground text-xs">
                  Placed on {formatDate(order.date)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5",
                    order.status === 'delivered' || order.status === 'completed'
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : order.status === 'cancelled'
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "border-primary/40 bg-primary/10 text-primary"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    order.status === 'delivered' || order.status === 'completed' ? "bg-emerald-500" :
                    order.status === 'cancelled' ? "bg-rose-500" : "bg-primary"
                  )} />
                  {order.status}
                </Badge>
                <button 
                  type="button"
                  onClick={() => generateInvoicePDF(order)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg hover:bg-muted text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Invoice
                </button>
              </div>
            </div>
          </div>

          {/* Main: mobile flex + order; lg: 5-col grid with dynamic rows for proof/track */}
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-5 lg:gap-x-5 lg:gap-y-3 items-start">
            {/* Delivery info — mobile order-2, desktop top-right */}
            <div
              className="order-2 lg:order-[0] bg-card border border-border rounded-2xl p-4 space-y-3 w-full"
              style={{
                gridColumn: '4 / 6',
                gridRow: layout.deliveryRow,
              }}
            >
              <h3 className="text-sm font-black tracking-tight">Delivery Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    {order.status === 'delivered' || order.status === 'completed' ? 'Delivered on' : 'Expected delivery'}
                  </p>
                  <p className="font-bold">{formatDate(order.deliveredAt || order.date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Current status</p>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold uppercase border-border bg-muted/40"
                  >
                    {order.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Payment method</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                      <payment.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold">{payment.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof thumbnail — mobile order-3 */}
            {layout.hasProof && order.proofImageUrl && (
              <div
                className="order-3 lg:order-[0] bg-card border border-border rounded-2xl p-4 space-y-2 w-full"
                style={{
                  gridColumn: '4 / 6',
                  gridRow: layout.proofRow ?? undefined,
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" />
                  Proof of delivery
                </p>
                <button
                  type="button"
                  onClick={() => setShowProofModal(true)}
                  className="block rounded-xl border border-border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ring-offset-2 ring-offset-background"
                  aria-label="View proof of delivery full size"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.proofImageUrl}
                    alt=""
                    className="h-24 w-24 object-cover bg-muted"
                  />
                </button>
                {order.deliveryNotes?.trim() && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <span className="font-semibold text-foreground/90">Courier note: </span>
                    {order.deliveryNotes.trim()}
                  </p>
                )}
              </div>
            )}

            {/* Track — mobile order-4 */}
            {layout.hasTrack && (
              <div
                className="order-4 lg:order-[0] w-full"
                style={{
                  gridColumn: '4 / 6',
                  gridRow: layout.trackRow ?? undefined,
                }}
              >
                <Link
                  href={`/order-tracking/${order.id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Track My Delivery
                </Link>
              </div>
            )}

            {/* Order summary — mobile order-5, desktop left column */}
            <div
              className="order-5 lg:order-[0] bg-card border border-border rounded-2xl overflow-hidden w-full flex flex-col"
              style={{
                gridColumn: '1 / 4',
                gridRow: `1 / span ${layout.summarySpan}`,
              }}
            >
              <div className="p-4 md:p-5">
                <h2 className="text-sm font-black tracking-tight mb-4">Order Summary</h2>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-border/50 bg-muted/30 shrink-0">
                        <ProductImage 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          containerClassName="!p-0"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs uppercase truncate">{renderEntityLabel(item.name)}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">Qty {item.quantity}</span>
                          {item.variantLabel && (
                            <span className="text-[10px] font-semibold text-primary uppercase bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{item.variantLabel}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-bold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-border/50 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground uppercase tracking-wide">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground uppercase tracking-wide">Shipping</span>
                    <span className={cn(order.shipping === 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                      {order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-3 border-t border-border/50">
                    <span className="text-sm font-black uppercase">Total</span>
                    <span className="text-xl font-black text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="px-4 md:px-5 pb-4 pt-0 border-t border-border/50">
                  <h3 className="flex items-center gap-2 text-sm font-black tracking-tight mt-4 mb-3">
                    <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    Order Timeline
                  </h3>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 md:p-4">
                    <ul className="relative space-y-0">
                      {order.statusHistory.map((entry, i) => {
                        const { dot, label } = statusTimelineColors(entry.newStatus);
                        const isLast = i === order.statusHistory!.length - 1;
                        return (
                          <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                            {!isLast && (
                              <span
                                className="absolute left-[6px] top-[14px] bottom-0 w-px bg-border"
                                aria-hidden
                              />
                            )}
                            <span
                              className={cn(
                                "relative z-[1] mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-card",
                                dot
                              )}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className={cn("text-xs font-bold uppercase tracking-wide", label)}>
                                {statusTimelineLabel(entry.newStatus)}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {formatTimelineTimestamp(entry.changedAt)}
                              </p>
                              {(entry.notes?.trim() || entry.trackingNumber || entry.courier) && (
                                <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground leading-snug">
                                  {entry.trackingNumber && (
                                    <p>
                                      <span className="font-semibold text-foreground/80">Tracking: </span>
                                      <span className="font-mono">{entry.trackingNumber}</span>
                                      {entry.courier && (
                                        <span className="text-muted-foreground"> · {entry.courier}</span>
                                      )}
                                    </p>
                                  )}
                                  {!entry.trackingNumber && entry.courier && (
                                    <p>
                                      <span className="font-semibold text-foreground/80">Courier: </span>
                                      {entry.courier}
                                    </p>
                                  )}
                                  {entry.notes?.trim() && (
                                    <p className="italic">{entry.notes.trim()}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {(['delivered', 'completed'].includes(order.status) ||
                ['pending', 'processing', 'paid'].includes(order.status)) && (
              <div className="px-4 md:px-5 pb-4 pt-2 border-t border-border/50 mt-auto">
                {['delivered', 'completed'].includes(order.status) && (
                  <div className="flex flex-wrap gap-2">
                    {!order.hasRated && (
                      <button
                        type="button"
                        onClick={() => setShowRatingModal(true)}
                        className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-primary text-primary rounded-xl hover:bg-primary/10 transition-colors font-bold text-[10px] uppercase tracking-wider"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOrderAgain}
                      disabled={isOrderingAgain}
                      className={cn(
                        "inline-flex flex-1 min-w-[100px] items-center justify-center gap-1.5 px-3 py-2.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity font-bold text-[10px] uppercase tracking-wider",
                        order.hasRated && "flex-[2]"
                      )}
                    >
                      {isOrderingAgain ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      Buy Again
                    </button>
                    {order.status === 'delivered' && !order.confirmedByCustomerAt && (
                      <button
                        type="button"
                        onClick={handleConfirmReceipt}
                        disabled={isConfirming}
                        className="inline-flex flex-1 min-w-full sm:min-w-[140px] basis-full sm:basis-auto items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-[10px] uppercase tracking-wider"
                      >
                        {isConfirming ? "Confirming..." : "Confirm Receipt"}
                      </button>
                    )}
                  </div>
                )}

                {['pending', 'processing', 'paid'].includes(order.status) && (
                  <button
                    type="button"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full px-4 py-2.5 border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>
                )}
              </div>
              )}
            </div>

            {/* Shipping To — mobile order-6 */}
            <div
              className="order-6 lg:order-[0] bg-muted/30 border border-border rounded-2xl p-4 space-y-3 w-full"
              style={{
                gridColumn: '4 / 6',
                gridRow: layout.shippingRow,
              }}
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shipping To</h3>
              <p className="font-bold text-sm uppercase tracking-tight">{order.shippingAddress.fullName}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {order.shippingAddress.street}, {order.shippingAddress.city}<br />
                {order.shippingAddress.province}, {order.shippingAddress.zip}
              </p>
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Contact</p>
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {order.shippingAddress.phone}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Proof lightbox */}
        {showProofModal && order.proofImageUrl && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Proof of delivery"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowProofModal(false)}
          >
            <button
              type="button"
              onClick={() => setShowProofModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/90 border border-border text-foreground hover:bg-muted z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.proofImageUrl}
              alt="Proof of delivery"
              className="max-h-[90vh] max-w-full w-auto object-contain rounded-lg border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

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
