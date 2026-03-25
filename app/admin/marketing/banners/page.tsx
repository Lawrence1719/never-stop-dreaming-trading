'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { BannerModal, PLACEMENTS } from '@/components/admin/marketing/BannerModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [bannerToDelete, setBannerToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      toast.error('Error fetching banners: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleEdit = (banner: any) => {
    setSelectedBanner(banner);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedBanner(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (banner: any) => {
    setBannerToDelete(banner);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', bannerToDelete.id);

      if (error) throw error;
      toast.success('Banner deleted');
      fetchBanners();
    } catch (error: any) {
      toast.error('Error deleting banner: ' + error.message);
    } finally {
      setIsDeleting(false);
      setBannerToDelete(null);
    }
  };

  const getPlacementLabel = (value: string) => {
    return PLACEMENTS.find(p => p.value === value)?.label || value;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'outline';
      case 'scheduled': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banners</h1>
          <p className="text-muted-foreground mt-1">Manage promotional banners</p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Create Banner
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-32 w-full rounded" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle>No banners found</CardTitle>
          <CardDescription className="mt-2">
            Click the "Create Banner" button to add your first marketing banner.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="line-clamp-1">{banner.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {getPlacementLabel(banner.placement)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(banner)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(banner)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative bg-muted h-32 rounded overflow-hidden flex items-center justify-center text-muted-foreground">
                  {banner.image_url ? (
                    <Image 
                      src={banner.image_url} 
                      alt={banner.title} 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-xs opacity-50">No Image Preview</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Clicks</p>
                    <p className="font-bold text-lg">{banner.clicks || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Impressions</p>
                    <p className="font-bold text-lg">{banner.impressions || 0}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(banner.status)}>
                  {banner.status.charAt(0).toUpperCase() + banner.status.slice(1)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BannerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        banner={selectedBanner}
        onSuccess={fetchBanners}
      />

      <AlertDialog open={!!bannerToDelete} onOpenChange={() => setBannerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the banner
              "<span className="font-semibold text-foreground">{bannerToDelete?.title}</span>" 
              and its performance data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
