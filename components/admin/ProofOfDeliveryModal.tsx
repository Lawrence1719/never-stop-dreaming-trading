'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

interface DeliveryProof {
  proof_image_url: string;
  delivery_notes: string;
  delivered_at: string;
  admin_overridden?: boolean;
  courier: {
    name: string;
  };
}

export function ProofOfDeliveryModal({ isOpen, onOpenChange, orderId }: ProofOfDeliveryModalProps) {
  const [proof, setProof] = useState<DeliveryProof | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchProof();
    }
  }, [isOpen, orderId]);

  const fetchProof = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('courier_deliveries')
        .select('proof_image_url, delivery_notes, delivered_at, admin_overridden, courier:profiles!courier_id(name)')
        .eq('order_id', orderId)
        .in('status', ['delivered', 'proof_pending'])
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('No proof of delivery found for this order.');
      } else {
        setProof(data as any);
      }
    } catch (err) {
      console.error('Failed to fetch delivery proof:', err);
      setError('Failed to load proof of delivery information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Proof of Delivery
          </DialogTitle>
          <DialogDescription>
            Order #{orderId.slice(0, 8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading proof information...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : proof ? (
          <div className="space-y-6 pt-4">
            {/* Proof Image */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
              {proof.proof_image_url ? (
                <img
                  src={proof.proof_image_url}
                  alt="Proof of Delivery"
                  className="w-full h-full object-contain"
                />
              ) : proof.admin_overridden ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                  <Clock className="w-12 h-12 mb-3 text-yellow-500" />
                  <p className="font-semibold text-yellow-700">⏳ Waiting for courier to upload proof of delivery</p>
                  <p className="text-xs mt-2 text-muted-foreground">Admin confirmed this delivery, but visual evidence is still pending from the courier.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <p>No image uploaded</p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Courier</p>
                    <p className="text-sm font-semibold">{proof.courier?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Delivered At</p>
                    <p className="text-sm">{formatDate(proof.delivered_at)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Delivery Notes</p>
                    <p className="text-sm bg-muted/50 p-2 rounded-md italic mt-1 min-h-[60px]">
                      {proof.delivery_notes || 'No notes provided.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm font-medium">
                {proof.admin_overridden && proof.proof_image_url && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> ✅ Proof submitted by courier after admin confirmation
                  </span>
                )}
              </div>
              <Badge variant="success" className={`${proof.admin_overridden && !proof.proof_image_url ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'} border-none px-3 py-1`}>
                {proof.admin_overridden && !proof.proof_image_url ? 'Pending Proof' : 'Verified Delivered'}
              </Badge>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
