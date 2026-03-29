"use client";

import { useState, useEffect } from "react";
import { Product, Profile } from "@/lib/types";
import { Star, MessageSquare, Loader2, Edit2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils/formatting";

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  title?: string;
  variant_name?: string;
  comment: string;
  status: 'approved' | 'rejected';
  admin_reply?: string;
  is_overridden?: boolean;
  created_at: string;
  profiles?: {
    name: string;
  };
}

interface ProductReviewsProps {
  product: Product;
  onReviewSubmitted?: () => void;
}

export function ProductReviews({ product, onReviewSubmitted }: ProductReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [deliveredOrderId, setDeliveredOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
    if (user) {
      checkEligibility();
    } else {
      setEligibilityChecked(true);
    }
  }, [product.id, user]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles (
            name
          )
        `)
        .eq('product_id', product.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
      
      const existingReview = data?.find(r => r.user_id === user?.id);
      if (existingReview) {
        setUserReview(existingReview);
        setRating(existingReview.rating);
        setTitle(existingReview.title || "");
        setComment(existingReview.comment || "");
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    try {
      // Check if user has a finalized (completed) order for this product
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, items, confirmed_by_customer_at, auto_confirmed')
        .eq('user_id', user?.id)
        .eq('status', 'completed');

      if (error) throw error;

      // Further filter for confirmed receipt by the customer
      const confirmedOrders = orders?.filter(o => o.confirmed_by_customer_at || o.auto_confirmed);
      const confirmedOrderIds = (confirmedOrders || []).map(o => o.id);

      // Check order_items table for inclusion of this product in those confirmed orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('product_id', product.id)
        .in('order_id', confirmedOrderIds.length > 0 ? confirmedOrderIds : ['00000000-0000-0000-0000-000000000000']);

      if (itemsError) throw itemsError;

      const hasDeliveredOrder = orderItems && orderItems.length > 0;
      
      // Fallback to JSONB items check
      const hasJsonbOrder = confirmedOrders?.some(o => 
        o.items && Array.isArray(o.items) && o.items.some((item: any) => item.product_id === product.id)
      );

      if (hasDeliveredOrder || hasJsonbOrder) {
        setIsEligible(true);
        // Store the order ID for the review
        const orderId = orderItems?.[0]?.order_id || confirmedOrders?.find(o => o.items?.some((i: any) => i.product_id === product.id))?.id;
        setDeliveredOrderId(orderId || null);
      }
    } catch (err) {
      console.error('Error checking eligibility:', err);
    } finally {
      setEligibilityChecked(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !deliveredOrderId) return;

    setIsSubmitting(true);
    try {
      // Use the API route for moderation support
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`/api/orders/${deliveredOrderId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          rating, 
          reviewText: comment,
          title: title
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit review");
      }

      if (result.moderated) {
        toast({ 
          title: "Review Moderated", 
          description: result.message,
          variant: "warning" 
        });
      } else {
        toast({ title: userReview ? "Review updated" : "Review submitted", variant: "success" });
      }

      setIsEditing(false);
      fetchReviews();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: any) {
      toast({ 
        title: "Error submitting review", 
        description: err.message || "Something went wrong", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderReviewForm = () => (
    <div className={`${reviews.length === 0 ? "" : "bg-card border border-border rounded-lg p-6"}`}>
      {!user ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-4">Login to leave a review</p>
          <Link href="/login" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
            Login
          </Link>
        </div>
      ) : !eligibilityChecked ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      ) : isEligible ? (
        userReview && !isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">You've already reviewed this product</span>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Edit2 className="w-4 h-4" />
              Edit your review
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star 
                      className={`w-8 h-8 ${star <= rating ? "text-accent fill-accent" : "text-muted"}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">Review Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience (optional)"
                className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="comment" className="block text-sm font-medium mb-1">Comment</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                placeholder="Share your experience..."
                className="w-full min-h-[100px] bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {userReview ? "Update Review" : "Submit Review"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </form>
        )
      ) : (
        <div className={`text-center ${reviews.length === 0 ? "pt-2" : "bg-secondary/10 border border-border rounded-lg p-4"}`}>
          <p className="text-sm font-medium text-muted-foreground italic tracking-tight">Only verified buyers with confirmed & finalized orders can review</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest font-bold">Admin & Customer confirmation required</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="border-t border-border pt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Customer Reviews ({reviews.length})</h2>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center text-center max-w-2xl mx-auto w-full shadow-sm">
          <div className="mb-8">
            <div className="flex justify-center gap-1.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 text-muted/30" strokeWidth={1.5} />
              ))}
            </div>
            <h3 className="text-xl font-bold mb-2">Be the first to review!</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              Share your experience with other customers and help them make informed decisions.
            </p>
          </div>
          
          <div className="w-full pt-8 border-t border-border/50">
            {renderReviewForm()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
          {/* Review Form Column */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Leave a Review</h3>
              {renderReviewForm()}
            </div>
          </div>

          {/* Reviews List Column */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-card border border-border rounded-lg p-6 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{review.profiles?.name || 'Verified Buyer'}</span>
                      {review.order_id && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {review.variant_name && (
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        Variant: {review.variant_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < review.rating ? "text-accent fill-accent" : "text-muted/30"}`} 
                      strokeWidth={i < review.rating ? 2 : 1.5}
                    />
                  ))}
                </div>
                {review.title && (
                  <h4 className="font-bold text-sm text-foreground">{review.title}</h4>
                )}
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {review.comment}
                </p>

                {/* Admin Reply */}
                {review.admin_reply && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Admin Reply</p>
                    <p className="text-sm text-foreground italic">"{review.admin_reply}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
