'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

import { Banner } from '@/lib/types';

const bannerSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  placement: z.enum(['homepage_hero', 'product_page', 'sidebar', 'header']),
  link_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'scheduled']),
  starts_at: z.string().optional().or(z.literal('')),
  ends_at: z.string().optional().or(z.literal('')),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner?: Banner;
  onSuccess: () => void;
}

export const PLACEMENTS = [
  { value: 'homepage_hero', label: 'Homepage Hero' },
  { value: 'product_page', label: 'Product Page' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'header', label: 'Header' },
];

export function BannerModal({ isOpen, onClose, banner, onSuccess }: BannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: '',
      placement: 'homepage_hero',
      link_url: '',
      status: 'inactive',
      starts_at: '',
      ends_at: '',
    },
  });

  useEffect(() => {
    if (banner) {
      form.reset({
        title: banner.title,
        placement: banner.placement,
        link_url: banner.link_url || '',
        status: banner.status,
        starts_at: banner.starts_at ? new Date(banner.starts_at).toISOString().slice(0, 16) : '',
        ends_at: banner.ends_at ? new Date(banner.ends_at).toISOString().slice(0, 16) : '',
      });
      setImageUrl(banner.image_url);
    } else {
      form.reset({
        title: '',
        placement: 'homepage_hero',
        link_url: '',
        status: 'inactive',
        starts_at: '',
        ends_at: '',
      });
      setImageUrl(null);
    }
  }, [banner, form, isOpen]);

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = fileName; // Upload to root of 'banners' bucket

      console.log('Attempting upload to bucket "banners" at path:', filePath);

      const { data, error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, data:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrl);
      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload Error:', error);
      toast.error('Error uploading image: ' + (error.message || 'Unknown error. Check console for details.'));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: BannerFormValues) => {
    setLoading(true);
    try {
      const bannerData = {
        ...values,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
      };

      if (banner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', banner.id);
        if (error) throw error;
        toast.success('Banner updated');
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([bannerData]);
        if (error) throw error;
        toast.success('Banner created');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Error saving banner: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{banner ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
          <DialogDescription>
            {banner ? 'Modify the banner details below.' : 'Add a new banner to your marketing campaigns.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Sale 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="placement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placement</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select placement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLACEMENTS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/promo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Banner Image</FormLabel>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 bg-muted/50 hover:bg-muted transition-colors relative min-h-[160px]">
                {imageUrl ? (
                  <div className="relative w-full h-40">
                    <Image 
                      src={imageUrl} 
                      alt="Preview" 
                      fill 
                      className="object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer group flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-2 py-1 rounded text-xs">
                        Click to change image
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={onImageUpload}
                        disabled={uploading}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center pointer-events-none">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click or drag to upload</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Recommended ratio 16:9 for homepage, sidebar etc.
                        </p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer h-full"
                      onChange={onImageUpload}
                      disabled={uploading}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="starts_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts At</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ends_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends At</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading || uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {banner ? 'Update Banner' : 'Create Banner'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
