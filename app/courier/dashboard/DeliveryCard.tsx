'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, User, Package, Upload, CheckCircle, Clock, Loader2, Image as ImageIcon, Camera, FolderOpen, X, XCircle, AlertCircle } from 'lucide-react';
import { formatPrice, formatDate, formatOrderNumber } from '@/lib/utils/formatting';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { rejectionReasonLabels } from '@/lib/constants/delivery';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderItem {
  name: string;
  quantity: number;
}

interface DeliveryCardProps {
  delivery: {
    id: string;
    order_id: string;
    status: string;
    created_at: string;
    delivery_notes?: string;
    proof_image_url?: string;
    delivered_at?: string;
    rejection_reason?: string;
    rejection_notes?: string;
    rejected_at?: string;
    order: {
      total: number;
      items: any[];
      shipping_address: {
        full_name: string;
        street_address: string;
        city: string;
        province: string;
        zip_code: string;
        phone: string;
      };
    };
  };
  courierId: string;
  onUpdate: () => void;
  orderNumber?: number;
}

export function DeliveryCard({ delivery, courierId, onUpdate, orderNumber }: DeliveryCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const isDelivered = delivery.status === 'delivered';
  const isFailed = delivery.status === 'failed';
  const isProofPending = delivery.status === 'proof_pending';
  const [showUploadForm, setShowUploadForm] = useState(isProofPending);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const { toast } = useToast();

  // Refs for programmatic triggering
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraPendingInputRef = useRef<HTMLInputElement>(null);
  const galleryPendingInputRef = useRef<HTMLInputElement>(null);

  // Persistence: Restore state from sessionStorage on mount
  useEffect(() => {
    const savedNotes = sessionStorage.getItem(`delivery-notes-${delivery.id}`);
    const savedPreview = sessionStorage.getItem(`delivery-preview-${delivery.id}`);
    const savedShowForm = sessionStorage.getItem(`delivery-showform-${delivery.id}`);
    
    if (savedNotes) setNotes(savedNotes);
    if (savedPreview) setPreview(savedPreview);
    if (savedShowForm === 'true') setShowUploadForm(true);
  }, [delivery.id]);

  // Persistence: Save state to sessionStorage
  useEffect(() => {
    if (notes) sessionStorage.setItem(`delivery-notes-${delivery.id}`, notes);
    else sessionStorage.removeItem(`delivery-notes-${delivery.id}`);
  }, [notes, delivery.id]);

  useEffect(() => {
    if (preview) {
      try {
        sessionStorage.setItem(`delivery-preview-${delivery.id}`, preview);
      } catch (e) {
        console.warn('Failed to save preview to sessionStorage (likely too large)', e);
      }
    } else {
      sessionStorage.removeItem(`delivery-preview-${delivery.id}`);
    }
  }, [preview, delivery.id]);

  useEffect(() => {
    sessionStorage.setItem(`delivery-showform-${delivery.id}`, showUploadForm ? 'true' : 'false');
  }, [showUploadForm, delivery.id]);

  const openInput = (ref: { current: HTMLInputElement | null }) => {
    if (ref.current) {
      ref.current.value = '';
      ref.current.click();
    }
  };

  if (!delivery.order) {
    return (
      <Card className="overflow-hidden border-2 border-red-200 bg-red-50/10 h-full">
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-bold text-red-600 uppercase tracking-tighter">⚠️ Order Record Missing</p>
          <p className="text-[10px] text-red-500 mt-2 font-medium">Assignment ID: {delivery.id}</p>
          <p className="text-xs text-red-500 mt-4 italic opacity-70">The order reference was not found in the database. Please contact support.</p>
        </CardContent>
      </Card>
    );
  }

  const addr = delivery.order.shipping_address;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Compress and resize image before previewing/saving
      // This solves two problems: 
      // 1. Faster uploads on mobile
      // 2. Fits in sessionStorage so we can survive page refreshes
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height *= MAX_DIM / width;
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width *= MAX_DIM / height;
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
      });

      setFile(selectedFile); // Keep original for now, but we can reconstruct it from base64 if needed
      setPreview(compressedBase64);
    } catch (err) {
      console.error('Image processing failed', err);
      toast({ title: 'Error', description: 'Failed to process image', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    sessionStorage.removeItem(`delivery-preview-${delivery.id}`);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraPendingInputRef.current) cameraPendingInputRef.current.value = '';
    if (galleryPendingInputRef.current) galleryPendingInputRef.current.value = '';
  };

  const handleSubmitProof = async () => {
    let uploadFile = file;

    // If file is missing (due to page refresh) but we have the preview, 
    // reconstruct the file from the base64 preview.
    if (!uploadFile && preview) {
      try {
        const res = await fetch(preview);
        const blob = await res.blob();
        uploadFile = new File([blob], 'proof.jpg', { type: 'image/jpeg' });
      } catch (e) {
        console.error('Failed to reconstruct file from preview', e);
      }
    }

    if (!uploadFile) {
      toast({ title: 'Error', description: 'Please select a proof image', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('notes', notes);
      formData.append('courierId', courierId);

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/courier/deliveries/${delivery.order_id}/proof`, {
        method: 'POST',
        headers: {
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload proof');
      }

      // Success! Clean up storage
      sessionStorage.removeItem(`delivery-notes-${delivery.id}`);
      sessionStorage.removeItem(`delivery-preview-${delivery.id}`);
      sessionStorage.removeItem(`delivery-showform-${delivery.id}`);

      toast({ 
        title: 'Success', 
        description: 'Delivery proof uploaded. Order marked as delivered.',
        variant: 'success'
      });
      onUpdate();
      setShowUploadForm(false);
    } catch (err) {
      console.error('Upload failed', err);
      toast({ title: 'Upload Failed', description: err instanceof Error ? err.message : 'An error occurred', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      toast({ title: 'Error', description: 'Please select a reason for rejection', variant: 'destructive' });
      return;
    }

    setIsRejecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/courier/deliveries/${delivery.order_id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          reason: rejectReason,
          notes: rejectNotes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record rejection');
      }

      toast({ 
        title: 'Success', 
        description: 'Delivery rejection recorded. Order has been cancelled.',
        variant: 'success'
      });
      
      setShowRejectModal(false);
      onUpdate();
    } catch (err) {
      console.error('Rejection failed', err);
      toast({ title: 'Rejection Failed', description: err instanceof Error ? err.message : 'An error occurred', variant: 'destructive' });
    } finally {
      setIsRejecting(false);
    }
  };



  return (
    <Card className={`flex flex-col h-full overflow-hidden border-2 transition-all hover:shadow-xl group/card ${isDelivered ? 'border-green-100 bg-green-50/10' : 'border-border/50 bg-background/50 backdrop-blur-sm'}`}>
      <CardHeader className="p-6 border-b bg-muted/20">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
               <span className="text-cyan-400">#</span>
               {orderNumber ? formatOrderNumber(orderNumber).replace('#', '') : delivery.order_id.slice(0, 8).toUpperCase()}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Assigned {formatDate(delivery.created_at)}</p>
            </div>
          </div>
          {isProofPending ? (
            <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600 text-white capitalize flex items-center gap-1">
              ⚠️ Proof Required
            </Badge>
          ) : (
            <Badge variant={isDelivered ? 'success' : isFailed ? 'destructive' : 'default'} className="capitalize">
              {delivery.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 flex-1 flex flex-col gap-6">
        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-primary mt-1" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
              <p className={cn("text-sm font-medium", !addr?.full_name && "text-muted-foreground italic")}>
                {addr?.full_name || 'Anonymous / Guest'}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
              {addr ? (
                <div className="text-sm leading-relaxed line-clamp-2" title={`${addr.street_address}, ${addr.city}, ${addr.province} ${addr.zip_code}`}>
                  {addr.street_address}, {addr.city}, {addr.province} {addr.zip_code}
                </div>
              ) : (
                <div className="text-sm text-amber-500 font-bold bg-amber-500/5 rounded p-1 inline-block">
                  ⚠️ Address Unavailable
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-primary mt-1" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
              <p className={cn("text-sm font-medium", !addr?.phone && "text-muted-foreground italic")}>
                {addr?.phone || 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
          </div>
          <div className="space-y-1">
             {(delivery.order.items as any[] || []).map((item, idx) => (
               <div key={idx} className="flex justify-between text-sm">
                 <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
               </div>
             ))}
             <div className="flex justify-between text-sm font-bold pt-1 border-t mt-1">
               <span>Total Value</span>
               <span className="text-primary">{formatPrice(delivery.order.total)}</span>
             </div>
          </div>
        </div>

        {isProofPending && (
          <div className="mt-3 p-3 bg-yellow-50/50 rounded-lg border border-yellow-200">
            <p className="text-sm font-semibold text-yellow-800 mb-1">Admin Confirmed Delivery</p>
            <p className="text-xs text-yellow-700">
              This delivery was confirmed by the admin. Please upload your proof of delivery for records.
            </p>
          </div>
        )}

        {isFailed && delivery.rejection_reason && (
          <div className="mt-3 p-3 bg-rose-50/50 rounded-lg border border-rose-100">
            <p className="text-xs font-bold text-rose-800 mb-2 uppercase">Rejection Details</p>
            <div className="flex items-start gap-2 mb-2">
               <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
               <div className="min-w-0 flex-1">
                 <p className="text-sm font-bold text-rose-700">
                   {rejectionReasonLabels[delivery.rejection_reason] || delivery.rejection_reason}
                 </p>
                 {delivery.rejection_notes && (
                   <p className="text-xs text-rose-600 mt-1 italic">"{delivery.rejection_notes}"</p>
                 )}
               </div>
            </div>
            <p className="text-[10px] text-rose-500 mt-2">Rejected on {formatDate(delivery.rejected_at || '')}</p>
          </div>
        )}

        {isDelivered && delivery.proof_image_url && (
          <div className="mt-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
            <p className="text-xs font-bold text-green-800 mb-2">PROOOF OF DELIVERY</p>
            <div className="relative aspect-video rounded-md overflow-hidden bg-muted border">
               <img src={delivery.proof_image_url} alt="Proof" className="w-full h-full object-cover" />
            </div>
            {delivery.delivery_notes && (
              <p className="text-xs text-green-700 italic mt-2">"{delivery.delivery_notes}"</p>
            )}
            <p className="text-[10px] text-green-600 mt-2">Delivered on {formatDate(delivery.delivered_at || '')}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto bg-muted/10 border-t pt-4">
        {!isDelivered && !isProofPending && !isFailed ? (
          !showUploadForm ? (
            <div className="flex flex-col gap-2 w-full">
              <Button 
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest group shadow-lg shadow-primary/10" 
                onClick={() => setShowUploadForm(true)}
              >
                <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Complete Delivery
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-rose-500/30 text-rose-600 hover:bg-rose-500/5 h-11 rounded-xl font-bold text-xs uppercase tracking-wider" 
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Customer Rejected
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label>Proof of Delivery</Label>
                {/* Hidden inputs — triggered via ref to avoid mobile camera bug */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                  tabIndex={-1}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                  tabIndex={-1}
                />
                {/* Preview */}
                {preview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                    <img 
                      src={preview} 
                      alt="Proof preview" 
                      className="w-full h-full object-cover" 
                      onError={() => {
                        toast({ title: 'Preview Error', description: 'Failed to display image. You can still try to submit.', variant: 'destructive' });
                      }}
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Ready
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openInput(cameraInputRef)}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-cyan-400/50 bg-cyan-400/5 hover:bg-cyan-400/10 cursor-pointer transition text-center"
                    >
                      <Camera className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-400">Take Photo</span>
                      <span className="text-[10px] text-muted-foreground">Use camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openInput(galleryInputRef)}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:bg-muted/30 cursor-pointer transition text-center"
                    >
                      <FolderOpen className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Choose File</span>
                      <span className="text-[10px] text-muted-foreground">From gallery</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`notes-${delivery.id}`}>Delivery Notes (Optional)</Label>
                <Textarea 
                  id={`notes-${delivery.id}`}
                  placeholder="E.g. Left with neighbor, Received by owner..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowUploadForm(false)} disabled={isUploading}>
                  Cancel
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="flex-1 rounded-xl bg-cyan-400 text-black hover:bg-cyan-500 font-bold" 
                      disabled={isUploading || (!file && !preview)}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Confirm
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background border-border shadow-2xl rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black tracking-tight text-cyan-400 uppercase">Confirm Completion?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground font-medium text-base">
                        You are about to mark order <span className="text-foreground font-bold">{orderNumber ? formatOrderNumber(orderNumber) : `#${delivery.order_id.slice(0, 8).toUpperCase()}`}</span> as delivered. 
                        Once confirmed, this action cannot be undone. Please ensure the proof of delivery is accurate.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                      <AlertDialogCancel className="rounded-xl font-bold border-muted-foreground/20 hover:bg-muted">Review Details</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleSubmitProof}
                        className="bg-cyan-400 text-black hover:bg-cyan-500 rounded-xl font-black px-8"
                      >
                        Yes, Delivered
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )
        ) : isProofPending ? (
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Label>Proof of Delivery</Label>
              {/* Hidden inputs — triggered via ref to avoid mobile camera bug */}
              <input
                ref={cameraPendingInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                tabIndex={-1}
              />
              <input
                ref={galleryPendingInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                tabIndex={-1}
              />
              {/* Preview */}
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                  <img src={preview} alt="Proof preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openInput(cameraPendingInputRef)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-cyan-400/50 bg-cyan-400/5 hover:bg-cyan-400/10 cursor-pointer transition text-center"
                  >
                    <Camera className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-400">Take Photo</span>
                    <span className="text-[10px] text-muted-foreground">Use camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openInput(galleryPendingInputRef)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:bg-muted/30 cursor-pointer transition text-center"
                  >
                    <FolderOpen className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Choose File</span>
                    <span className="text-[10px] text-muted-foreground">From gallery</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`notes-${delivery.id}`}>Delivery Notes (Optional)</Label>
              <Textarea 
                id={`notes-${delivery.id}`}
                placeholder="E.g. Left with neighbor, Received by owner..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Button className="w-full" onClick={handleSubmitProof} disabled={isUploading || (!file && !preview)}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Submit Proof
            </Button>
          </div>
        ) : isFailed ? (
          <div className="w-full text-center py-2 flex items-center justify-center gap-2 text-rose-600 font-semibold">
            <XCircle className="w-5 h-5" />
            Delivery Rejected
          </div>
        ) : (
          <div className="w-full text-center py-2 flex items-center justify-center gap-2 text-green-600 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Delivery Completed
          </div>
        )}

        {/* Rejection Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-rose-600 uppercase">Report Delivery Rejection</DialogTitle>
              <DialogDescription className="font-medium">
                The customer has refused to accept this delivery.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Reason (Required)</Label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger id="reason" className="rounded-xl h-12">
                    <SelectValue placeholder="Select rejection reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(rejectionReasonLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the issue in more detail..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="min-h-[100px] rounded-xl"
                  maxLength={500}
                />
              </div>

              <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Important</AlertTitle>
                <AlertDescription className="text-xs font-medium">
                  This action cannot be undone. The order will be cancelled and the item will be marked for return to warehouse. The customer will be notified.
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setShowRejectModal(false)} disabled={isRejecting} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={isRejecting || !rejectReason}
                className="rounded-xl font-black uppercase tracking-widest px-8 h-12"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
