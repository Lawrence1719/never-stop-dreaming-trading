"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";

interface RatingModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rating: number, reviewText: string) => void;
}

export function RatingModal({ orderId, isOpen, onClose, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Validation Error", description: "Please select a star rating first.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`/api/orders/${orderId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rating, reviewText, title }),
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
        toast({ title: "Success", description: "Thank you for your review!" });
      }
      
      onSuccess(rating, reviewText);
      onClose();
    } catch (error: any) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({ 
        title: "Error Submitting Review", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Order</DialogTitle>
          <DialogDescription>
            How was your experience with this order?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                disabled={isSubmitting}
              >
                <Star
                  className={`w-10 h-10 ${(hoverRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Review Title (optional)</label>
              <input
                id="title"
                type="text"
                placeholder="Summarize your experience..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="review" className="text-sm font-medium">Add a written review (optional)</label>
              <Textarea
                id="review"
                placeholder="Tell us what you liked or how we can improve..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
