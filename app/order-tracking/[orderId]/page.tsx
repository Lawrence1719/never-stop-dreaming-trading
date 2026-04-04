"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TrackingData, TrackingUpdate } from "@/lib/types";
import { formatDate } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";
import { MapPin, Truck, Phone, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from "@/lib/supabase/client";
import { BackButton } from "./back-button";
import { useAuth } from "@/lib/context/auth-context";

async function fetchOrderTracking(orderId: string, userId: string): Promise<TrackingData | null> {
  try {
    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session found for tracking page');
      return null;
    }

    console.log('Fetching order tracking for orderId:', orderId, 'userId:', userId);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, status, tracking_number, courier, shipped_at, delivered_at, created_at, user_id,
        courier_profile:profiles!courier_id(name, phone),
        courier_deliveries(proof_image_url, delivery_notes, delivered_at)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
      return null;
    }

    if (!order) {
      console.error('No order found with id:', orderId);
      return null;
    }

    console.log('Order found:', { id: order.id, status: order.status, tracking_number: order.tracking_number });

    // Verify user owns this order (security check)
    if (order.user_id !== userId) {
      console.error('User does not own this order. Order user_id:', order.user_id, 'Session user.id:', userId);
      return null;
    }

    // Fetch status history for tracking timeline
    const { data: statusHistory, error: historyError } = await supabase
      .from('order_status_history')
      .select('id, old_status, new_status, changed_at, notes, tracking_number, courier')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false });

    if (historyError) {
      console.error('Status history fetch error:', historyError);
    }

    // Build tracking updates from status history
    const updates: TrackingUpdate[] = [];
    
    if (statusHistory && statusHistory.length > 0) {
      statusHistory.forEach((history: { id?: string; new_status: string; changed_at: string; notes: string | null }) => {
        const statusKey = String(history.new_status || '').toLowerCase();
        updates.push({
          id: history.id,
          status: formatTrackingStatusLabel(history.new_status),
          statusKey,
          location: history.notes || getDefaultLocationForStatus(history.new_status, order.courier),
          timestamp: history.changed_at,
          description: getDescriptionForStatus(history.new_status, order.courier, order.tracking_number),
        });
      });
    } else {
      const statusKey = String(order.status || '').toLowerCase();
      updates.push({
        status: formatTrackingStatusLabel(order.status),
        statusKey,
        location: getDefaultLocationForStatus(order.status, order.courier),
        timestamp: order.created_at,
        description: getDescriptionForStatus(order.status, order.courier, order.tracking_number),
      });
    }

    // Calculate estimated delivery (3-5 business days from ship date)
    let estimatedDelivery = new Date();
    if (order.shipped_at) {
      estimatedDelivery = new Date(order.shipped_at);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);
    } else {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
    }

    // Determine current location
    const currentLocation = updates[0]?.location || getDefaultLocationForStatus(order.status, order.courier);

    const trackingData: TrackingData = {
      orderId: order.id,
      status: order.status,
      location: currentLocation,
      estimatedDelivery: estimatedDelivery.toISOString(),
      updates: updates,
      trackingNumber: order.tracking_number ?? null,
      courierName: (order.courier_profile as any)?.name || null,
      courierPhone: (order.courier_profile as any)?.phone || null,
      proofImageUrl: (order.courier_deliveries?.[0] as any)?.proof_image_url || null,
      deliveryNotes: (order.courier_deliveries?.[0] as any)?.delivery_notes || null,
      deliveredAt: order.delivered_at,
    };

    return trackingData;
  } catch (error) {
    console.error('Unexpected error fetching tracking data:', error);
    return null;
  }
}

function getDefaultLocationForStatus(status: string, courier?: string | null): string {
  const courierName = courier || 'Local Courier';
  
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Order Processing Center';
    case 'paid':
      return 'Payment Confirmed';
    case 'processing':
      return 'Warehouse - Preparing Shipment';
    case 'shipped':
      return `${courierName} Facility`;
    case 'delivered':
      return 'Delivered to Customer';
    case 'completed':
      return 'Order Complete';
    case 'cancelled':
      return 'Order Cancelled';
    default:
      return 'Processing Center';
  }
}

function formatTrackingStatusLabel(raw: string): string {
  const s = raw.toLowerCase();
  if (s === 'paid') return 'Payment Confirmed';
  if (s === 'completed') return 'Delivered';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Dot, label, connector line, and accent border — hex-aligned where noted (shipped uses sky-500 = #0ea5e9) */
function getTrackingStatusStyles(statusKey: string): {
  dot: string;
  label: string;
  line: string;
  borderAccent: string;
} {
  const s = statusKey.toLowerCase();
  if (s === 'delivered' || s === 'completed')
    return {
      dot: 'bg-emerald-500',
      label: 'text-emerald-500',
      line: 'bg-emerald-500/55',
      borderAccent: 'border-emerald-500',
    };
  if (s === 'shipped')
    return {
      dot: 'bg-sky-500',
      label: 'text-sky-500',
      line: 'bg-sky-500/55',
      borderAccent: 'border-sky-500',
    };
  if (s === 'processing')
    return {
      dot: 'bg-blue-500',
      label: 'text-blue-500',
      line: 'bg-blue-500/55',
      borderAccent: 'border-blue-500',
    };
  if (s === 'pending')
    return {
      dot: 'bg-amber-500',
      label: 'text-amber-500',
      line: 'bg-amber-500/55',
      borderAccent: 'border-amber-500',
    };
  if (s === 'cancelled')
    return {
      dot: 'bg-red-500',
      label: 'text-red-500',
      line: 'bg-red-500/55',
      borderAccent: 'border-red-500',
    };
  if (s === 'paid')
    return {
      dot: 'bg-violet-500',
      label: 'text-violet-400',
      line: 'bg-violet-500/55',
      borderAccent: 'border-violet-500',
    };
  return {
    dot: 'bg-muted-foreground',
    label: 'text-foreground',
    line: 'bg-border',
    borderAccent: 'border-muted-foreground',
  };
}

type TimelineDotVariant = 'current' | 'past' | 'future';

function TimelineStepDot({
  statusKey,
  variant,
}: {
  statusKey: string;
  variant: TimelineDotVariant;
}) {
  const styles = getTrackingStatusStyles(statusKey);

  if (variant === 'future') {
    return (
      <div
        className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/45 bg-transparent"
        aria-hidden
      />
    );
  }

  if (variant === 'current') {
    return (
      <div
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full animate-pulse',
          styles.dot,
        )}
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div
      className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', styles.dot)}
      aria-hidden
    >
      <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.75} />
    </div>
  );
}

function getDescriptionForStatus(status: string, courier?: string | null, trackingNumber?: string | null): string {
  const courierName = courier || 'courier';
  const trackingInfo = trackingNumber ? ` Tracking number: ${trackingNumber}` : '';
  
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Your order has been received and is awaiting payment confirmation.';
    case 'paid':
      return 'Payment confirmed. Your order will be processed shortly.';
    case 'processing':
      return 'Your order is being prepared for shipment. Items are being picked and packed.';
    case 'shipped':
      return `Your order has been shipped via ${courierName}.${trackingInfo}`;
    case 'delivered':
      return 'Your order has been successfully delivered. Thank you for your purchase!';
    case 'completed':
      return 'Order completed and confirmed by customer.';
    case 'cancelled':
      return 'This order has been cancelled.';
    default:
      return 'Order is being processed.';
  }
}

export default function OrderTrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { user } = useAuth();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [proofLightboxOpen, setProofLightboxOpen] = useState(false);

  useEffect(() => {
    async function loadTracking() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchOrderTracking(orderId, user.id);
        setTracking(data);
      } catch (err) {
        console.error('Error loading tracking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tracking data');
      } finally {
        setIsLoading(false);
      }
    }

    loadTracking();
  }, [orderId, user]);

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to view tracking</h1>
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p>Loading tracking information...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle not authenticated or not found
  if (!tracking) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Tracking information not found</h1>
            <p className="text-muted-foreground mb-6">
              This order could not be found or you do not have permission to view it.
            </p>
            <Link href="/orders" className="text-primary hover:underline">
              Back to orders
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const proofUrl = tracking.proofImageUrl;

  const proofThumbnail = proofUrl ? (
    <div className="w-full h-fit">
      <p className="text-xs font-medium text-muted-foreground mb-2">PROOF OF DELIVERY</p>
      <button
        type="button"
        onClick={() => setProofLightboxOpen(true)}
        className="relative block w-full h-32 overflow-hidden rounded-lg border border-border bg-muted text-left ring-offset-background transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="View proof of delivery full size"
      >
        <img src={proofUrl} alt="" className="h-full w-full object-cover object-top" />
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-3 sm:pb-4">
          <BackButton />

          <h1 className="text-2xl font-bold mb-3 sm:mb-4">Track Your Order</h1>

          <div className="flex flex-col items-start gap-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start">
            {/* Left: compact timeline — mobile order 1 */}
            <div className="order-1 h-fit w-full min-w-0 self-start lg:col-span-2">
              <div className="flex h-fit w-full flex-col rounded-lg border border-border bg-card p-4">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Current Status</p>
                    <p
                      className={cn(
                        'text-lg font-bold capitalize',
                        getTrackingStatusStyles(tracking.status).label,
                      )}
                    >
                      {formatTrackingStatusLabel(tracking.status)}
                    </p>
                  </div>
                  <div className="shrink-0 text-2xl leading-none pt-0.5">
                    {tracking.status === 'delivered' || tracking.status === 'completed' ? (
                      <span className="text-emerald-500" aria-hidden>
                        ✓
                      </span>
                    ) : (
                      <Truck className="w-8 h-8 text-primary" aria-hidden />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col">
                  {tracking.updates.map((update: TrackingUpdate, i: number) => {
                    const key = update.id ?? `${update.timestamp}-${update.statusKey ?? update.status}-${i}`;
                    const sk = update.statusKey ?? update.status.toLowerCase();
                    const styles = getTrackingStatusStyles(sk);
                    const isLast = i === tracking.updates.length - 1;
                    const isCurrent = i === 0;
                    const dotVariant: TimelineDotVariant = isCurrent ? 'current' : 'past';

                    return (
                      <div
                        key={key}
                        className={cn('relative flex items-start gap-3', !isLast && 'pb-4')}
                      >
                        <div className="flex w-4 shrink-0 flex-col items-center">
                          <TimelineStepDot statusKey={sk} variant={dotVariant} />
                          {!isLast && (
                            <div
                              className={cn('mt-0.5 h-4 w-0.5 shrink-0', styles.line)}
                              aria-hidden
                            />
                          )}
                        </div>
                        <div
                          className={cn(
                            'min-w-0 flex-1 rounded-r-md border-l-2 pl-3',
                            isCurrent
                              ? cn('bg-muted/10 py-2', styles.borderAccent)
                              : 'border-transparent py-0.5',
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span
                              className={cn(
                                styles.label,
                                isCurrent ? 'text-sm font-bold' : 'text-sm font-semibold',
                              )}
                            >
                              {update.status}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(update.timestamp)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                            <span className="min-w-0 truncate">{update.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Proof — mobile order 2, desktop inside sidebar via duplicate placement */}
            {proofUrl && (
              <div className="order-2 w-full min-w-0 self-start lg:hidden h-fit">{proofThumbnail}</div>
            )}

            {/* Right column — mobile order 3 */}
            <div className="order-3 h-fit w-full min-w-0 self-start lg:col-span-1">
              <div className="flex h-fit w-full flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-20">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">ESTIMATED DELIVERY</p>
                  <p className="text-base font-bold sm:text-lg">{formatDate(tracking.estimatedDelivery)}</p>
                </div>

                <div className="hidden lg:block">{proofThumbnail}</div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">CURRENT LOCATION</p>
                  <p className="text-sm font-medium leading-snug">{tracking.location}</p>
                </div>

                {['shipped', 'delivered', 'completed'].includes(tracking.status) && tracking.courierName && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      YOUR COURIER
                    </p>
                    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{tracking.courierName}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {tracking.courierPhone || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">TRACKING INFO</p>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    TRACKING NUMBER
                  </p>
                  {tracking.trackingNumber ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 flex-1 overflow-x-auto">
                        <p className="whitespace-nowrap font-mono text-xs font-medium">
                          {tracking.trackingNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(tracking.trackingNumber!);
                            setTrackingCopied(true);
                            window.setTimeout(() => setTrackingCopied(false), 2000);
                          } catch {
                            setTrackingCopied(false);
                          }
                        }}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Copy tracking number"
                      >
                        {trackingCopied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not yet assigned</p>
                  )}
                </div>

                <Link
                  href={`/orders/${orderId}`}
                  className="block w-full rounded-lg border border-primary px-4 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  View Order Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {proofUrl && (
        <Dialog open={proofLightboxOpen} onOpenChange={setProofLightboxOpen}>
          <DialogContent
            className="max-h-[90vh] max-w-[min(90vw,56rem)] border-zinc-800 bg-zinc-950 p-2 sm:p-4"
            showCloseButton
          >
            <DialogTitle className="sr-only">Proof of delivery</DialogTitle>
            <img
              src={proofUrl}
              alt="Proof of delivery"
              className="mx-auto max-h-[85vh] w-full rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
