'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, User, Package, Upload, CheckCircle, Clock, Loader2, Image as ImageIcon } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils/formatting';
import { useToast } from '@/hooks/use-toast';

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
}

export function DeliveryCard({ delivery, courierId, onUpdate }: DeliveryCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const isDelivered = delivery.status === 'delivered';
  const isProofPending = delivery.status === 'proof_pending';
  const [showUploadForm, setShowUploadForm] = useState(isProofPending);
  const { toast } = useToast();

  if (!delivery.order || !delivery.order.shipping_address) {
    return (
      <Card className="overflow-hidden border-2 border-red-200 bg-red-50/10">
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-bold text-red-600">Error: Order details missing.</p>
          <p className="text-xs text-red-500 mt-1 italic">This may be due to a permissions issue or database sync delay.</p>
        </CardContent>
      </Card>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ title: 'Error', description: 'File size exceeds 10MB', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmitProof = async () => {
    if (!file) {
      toast({ title: 'Error', description: 'Please select a proof image', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', notes);
      formData.append('courierId', courierId);

      const res = await fetch(`/api/courier/deliveries/${delivery.order_id}/proof`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload proof');
      }

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


  return (
    <Card className={`flex flex-col h-full overflow-hidden border-2 transition-all ${isDelivered ? 'border-green-100 bg-green-50/10' : 'border-indigo-100'}`}>
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{delivery.order_id.slice(0, 8).toUpperCase()}</CardTitle>
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
            <Badge variant={isDelivered ? 'success' : 'default'} className="capitalize">
              {delivery.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 flex-1 flex flex-col gap-4">
        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-primary mt-1" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
              <p className="text-sm font-medium">{delivery.order.shipping_address.full_name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
              <div className="text-sm leading-relaxed line-clamp-2" title={`${delivery.order.shipping_address.street_address}, ${delivery.order.shipping_address.city}, ${delivery.order.shipping_address.province} ${delivery.order.shipping_address.zip_code}`}>
                {delivery.order.shipping_address.street_address}, {delivery.order.shipping_address.city}, {delivery.order.shipping_address.province} {delivery.order.shipping_address.zip_code}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-primary mt-1" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
              <p className="text-sm font-medium">{delivery.order.shipping_address.phone}</p>
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
        {!isDelivered && !isProofPending ? (
          !showUploadForm ? (
            <Button className="w-full group" onClick={() => setShowUploadForm(true)}>
              <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Complete Delivery
            </Button>
          ) : (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`proof-${delivery.id}`}>Upload Proof (Image)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id={`proof-${delivery.id}`} 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="flex-1 cursor-pointer"
                  />
                  {file && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                </div>
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
                <Button variant="ghost" className="flex-1" onClick={() => setShowUploadForm(false)} disabled={isUploading}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSubmitProof} disabled={isUploading || !file}>
                  {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Confirm
                </Button>
              </div>
            </div>
          )
        ) : isProofPending ? (
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`proof-${delivery.id}`}>Upload Proof (Image)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id={`proof-${delivery.id}`} 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="flex-1 cursor-pointer"
                />
                {file && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
              </div>
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

            <Button className="w-full" onClick={handleSubmitProof} disabled={isUploading || !file}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Submit Proof
            </Button>
          </div>
        ) : (
          <div className="w-full text-center py-2 flex items-center justify-center gap-2 text-green-600 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Delivery Completed
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
