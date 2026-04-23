'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Copy, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CouponModal } from '@/components/admin/coupons/CouponModal';
import { DeleteCouponDialog } from '@/components/admin/coupons/DeleteCouponDialog';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { format } from 'date-fns';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<any>(null);
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/coupons?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to fetch coupons');
      setCoupons(result.data);
      setMeta(result.meta);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied ${code} to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openEditModal = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedCoupon(null);
    setIsModalOpen(true);
  };

  const openDeleteDialog = (coupon: any) => {
    setCouponToDelete(coupon);
    setIsDeleteDialogOpen(true);
  };

  const formatDiscount = (coupon: any) => {
    if (coupon.type === 'percentage') return `${coupon.discount_value}%`;
    if (coupon.type === 'fixed') return `₱${coupon.discount_value}`;
    return 'Free';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-teal-500/20 text-teal-500 hover:bg-teal-500/20 border-teal-500/30">active</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">upcoming</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/20 border-orange-500/30">expired</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-500 hover:bg-gray-500/20 border-gray-500/30">inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount coupons</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>Active and inactive discount codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Discount</TableHead>
                  <TableHead className="font-semibold">Min. Purchase</TableHead>
                  <TableHead className="font-semibold">Usage</TableHead>
                  <TableHead className="font-semibold">Schedule</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading coupons...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No coupons found.
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                      <TableCell className="text-sm capitalize">{coupon.type.replace('_', ' ')}</TableCell>
                      <TableCell className="font-medium text-primary">{formatDiscount(coupon)}</TableCell>
                      <TableCell className="text-sm">
                        {Number(coupon.min_purchase) > 0 ? `₱${coupon.min_purchase}` : 'None'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{coupon.usage_count} / {coupon.usage_limit || '∞'}</span>
                          <span className="text-[10px] text-muted-foreground">Limit: {coupon.per_user_limit} per user</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-0.5 text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-10">Start:</span>
                            <span className="font-medium">
                              {coupon.starts_at ? format(new Date(coupon.starts_at), 'MMM dd, yyyy HH:mm') : 'Immediate'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-10">End:</span>
                            <span className="font-medium text-muted-foreground">
                              {coupon.expires_at ? format(new Date(coupon.expires_at), 'MMM dd, yyyy HH:mm') : 'Never'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(coupon.computed_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleCopy(coupon.code)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            {copiedCode === coupon.code ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(coupon)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDeleteDialog(coupon)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {coupons.length} of {meta.total} coupons
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      className="w-8 h-8 p-0"
                      disabled={isLoading}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CouponModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        coupon={selectedCoupon}
        onSuccess={fetchCoupons}
      />

      <DeleteCouponDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        coupon={couponToDelete}
        onSuccess={fetchCoupons}
      />
    </div>
  );
}
