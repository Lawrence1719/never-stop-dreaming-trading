"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { RatingModal } from "@/components/orders/RatingModal";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { Button } from "@/components/ui/button";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Package, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to view your orders');
        setIsLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        status,
        search,
        page: page.toString(),
        limit: "12"
      });

      const response = await fetch(`/api/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const json = await response.json();
      setOrders(json.data || []);
      setPagination(json.pagination);
      setStatusCounts(json.statusCounts);
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, status, search, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1); // Reset to first page on filter change
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleRatingSuccess = (orderId: string, rating: number, reviewText: string) => {
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, hasRated: true, rating, reviewText, ratedAt: new Date().toISOString() } : o
    ));
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-xl mx-auto px-4 py-32 text-center space-y-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tighter">Account Required</h1>
              <p className="text-muted-foreground">Please log in to view your order history and track your deliveries.</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full hover:shadow-lg transition-all font-bold"
            >
              Sign In to Your Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Navbar />

      <main className="flex-1 pb-20">
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight flex items-baseline gap-3">
              My Orders
              <span className="text-xs font-bold text-muted-foreground/40 bg-muted px-2 py-0.5 rounded-md uppercase tracking-widest">{statusCounts.all || 0}</span>
            </h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">Manage and track all your purchases in one place.</p>
          </div>

          <OrdersFilters 
            currentStatus={status}
            onStatusChange={handleStatusChange}
            onSearchChange={handleSearchChange}
            statusCounts={statusCounts}
          />

          <div className="mt-8">
            <div className="flex items-center justify-between px-1 mb-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                {isLoading ? "Updating list..." : `Showing ${orders.length} of ${pagination.total} orders`}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl h-40 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-destructive/20">
                <p className="text-destructive font-black text-xl mb-4">Something went wrong</p>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">{error}</p>
                <Button
                  onClick={() => fetchOrders()}
                  className="rounded-full px-8 font-bold"
                >
                  Refresh Page
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div className="space-y-2 max-w-xs mx-auto">
                  <p className="text-2xl font-black tracking-tight text-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {search || status !== 'all' 
                      ? "No orders match your current filters."
                      : "Start shopping to see your full order history."}
                  </p>
                </div>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full hover:shadow-lg transition-all font-black uppercase text-xs tracking-widest mt-4"
                >
                  Explore Products
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); if(page > 1) setPage(page - 1); }}
                            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: pagination.totalPages }).map((_, i) => {
                          const p = i + 1;
                          // Basic pagination logic for many pages
                          if (pagination.totalPages > 5) {
                            if (p !== 1 && p !== pagination.totalPages && Math.abs(p - page) > 1) {
                              if (p === 2 || p === pagination.totalPages - 1) {
                                return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
                              }
                              return null;
                            }
                          }

                          return (
                            <PaginationItem key={p}>
                              <PaginationLink 
                                href="#" 
                                isActive={page === p}
                                onClick={(e) => { e.preventDefault(); setPage(p); }}
                                className="cursor-pointer font-bold"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); if(page < pagination.totalPages) setPage(page + 1); }}
                            className={page === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {ratingOrder && (
          <RatingModal
            orderId={ratingOrder.id}
            isOpen={!!ratingOrder}
            onClose={() => setRatingOrder(null)}
            onSuccess={(rating, reviewText) => handleRatingSuccess(ratingOrder.id, rating, reviewText)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
