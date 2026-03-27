"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  Star, 
  Search, 
  Filter, 
  MoreVertical, 
  Reply, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  title: string | null;
  variant_name: string | null;
  comment: string | null;
  status: 'approved' | 'rejected';
  rejection_reason: string | null;
  admin_reply: string | null;
  is_overridden: boolean;
  moderated_at: string | null;
  created_at: string;
  profiles: {
    name: string;
  };
  products: {
    name: string;
  };
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  
  // Filters
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  // Actions
  const [replyReview, setReplyReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const [deleteReview, setDeleteReview] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [overrideReview, setOverrideReview] = useState<Review | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [status, ratingFilter, productFilter]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name');
    setProducts(data || []);
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          profiles(name),
          products(name)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (ratingFilter !== "all") {
        query = query.eq('rating', parseInt(ratingFilter));
      }

      if (productFilter !== "all") {
        query = query.eq('product_id', productFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast({ title: "Error", description: "Failed to load reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyReview) return;
    setIsReplying(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ admin_reply: replyText })
        .eq('id', replyReview.id);

      if (error) throw error;
      toast({ title: "Success", description: "Reply saved successfully" });
      setReplyReview(null);
      setReplyText("");
      fetchReviews();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReview) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', deleteReview.id);

      if (error) throw error;
      toast({ title: "Success", description: "Review deleted successfully" });
      setDeleteReview(null);
      fetchReviews();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReview) return;
    setIsOverriding(true);
    try {
      const newStatus = overrideReview.status === 'approved' ? 'rejected' : 'approved';
      const { error } = await supabase
        .from('reviews')
        .update({ 
          status: newStatus, 
          is_overridden: true,
          moderated_at: new Date().toISOString()
        })
        .eq('id', overrideReview.id);

      if (error) throw error;
      toast({ title: "Success", description: `Review ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully` });
      setOverrideReview(null);
      fetchReviews();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews & Ratings</h1>
          <p className="text-muted-foreground">Manage customer feedback and moderation.</p>
        </div>
      </div>

      <Tabs defaultValue="approved" onValueChange={(val) => setStatus(val as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-4">
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={status} className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
              <Star className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <CardTitle>No reviews found</CardTitle>
              <CardDescription>Try adjusting your filters or switching tabs.</CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <Card key={review.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted"}`} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={review.status === 'approved' ? 'success' : 'destructive'}>
                          {review.status}
                        </Badge>
                        {review.is_overridden && (
                          <Badge variant="outline" className="border-primary text-primary">Overridden</Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-base line-clamp-1">{review.title || "Untitled Review"}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      By <span className="font-medium text-foreground">{review.profiles?.name}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <p className="text-sm border-l-2 border-primary/20 pl-3 italic mb-1 text-muted-foreground truncate">
                      For: {review.products?.name}
                    </p>
                    {review.variant_name && (
                      <p className="text-[10px] font-medium text-muted-foreground mb-4">
                        Variant: {review.variant_name}
                      </p>
                    )}
                    <p className="text-sm line-clamp-4 text-foreground leading-relaxed">
                      {review.comment}
                    </p>
                    {review.admin_reply && (
                      <div className="mt-4 p-3 bg-primary/5 rounded border border-primary/10">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Your Reply</p>
                        <p className="text-xs text-foreground line-clamp-2 italic">"{review.admin_reply}"</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-4 border-t bg-muted/30 flex justify-between">
                    <div className="text-[10px] text-muted-foreground">
                      {format(new Date(review.created_at), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2"
                        onClick={() => {
                          setReplyReview(review);
                          setReplyText(review.admin_reply || "");
                        }}
                      >
                        <Reply className="w-4 h-4 mr-1" /> Reply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteReview(review)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2"
                        onClick={() => setOverrideReview(review)}
                      >
                        {review.status === 'approved' ? (
                          <><XCircle className="w-4 h-4 mr-1" /> Reject</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-1" /> Approve</>
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={!!replyReview} onOpenChange={(open) => !open && setReplyReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Reply</DialogTitle>
            <DialogDescription>
              Write a response to this customer review.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg text-sm mb-4">
             <p className="font-bold mb-1">{replyReview?.profiles?.name}</p>
             <p className="italic">"{replyReview?.comment}"</p>
          </div>
          <Textarea 
            placeholder="Write your reply here..." 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyReview(null)}>Cancel</Button>
            <Button onClick={handleReply} disabled={isReplying}>
              {isReplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteReview} onOpenChange={(open) => !open && setDeleteReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReview(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={!!overrideReview} onOpenChange={(open) => !open && setOverrideReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {overrideReview?.status === 'approved' ? "Reject Review?" : "Approve Review?"}
            </DialogTitle>
            <DialogDescription>
              {overrideReview?.status === 'approved' 
                ? "This review will no longer be visible on product pages." 
                : "This review will become visible on product pages."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideReview(null)}>Cancel</Button>
            <Button onClick={handleOverride} disabled={isOverriding}>
              {isOverriding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
