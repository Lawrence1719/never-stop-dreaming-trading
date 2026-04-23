'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Loader2, 
  AlertCircle, 
  Lock, 
  Calendar as CalendarIcon, 
  Info, 
  X 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CouponSchema, type CouponFormValues } from '@/lib/validators/coupon';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CouponModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: any;
  onSuccess: () => void;
}

import { DateTimePicker } from './DateTimePicker';

export function CouponModal({
  isOpen,
  onOpenChange,
  coupon,
  onSuccess,
}: CouponModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(CouponSchema),
    defaultValues: {
      code: '',
      type: 'percentage',
      discount_value: undefined as any,
      min_purchase: 0,
      usage_limit: null,
      per_user_limit: 1,
      starts_at: null,
      expires_at: null,
      status: 'active',
    },
  });

  const { watch, setValue, reset, setError, formState: { errors } } = form;
  const couponType = watch('type');
  const couponCode = watch('code');

  useEffect(() => {
    if (coupon) {
      reset({
        code: coupon.code,
        type: coupon.type,
        discount_value: Number(coupon.discount_value),
        min_purchase: Number(coupon.min_purchase),
        usage_limit: coupon.usage_limit,
        per_user_limit: Number(coupon.per_user_limit),
        starts_at: coupon.starts_at || null,
        expires_at: coupon.expires_at || null,
        status: coupon.status,
      });
      setIsUnlimited(coupon.usage_limit === null);
    } else {
      reset({
        code: '',
        type: 'percentage',
        discount_value: undefined as any,
        min_purchase: 0,
        usage_limit: null,
        per_user_limit: 1,
        starts_at: null,
        expires_at: null,
        status: 'active',
      });
      setIsUnlimited(true);
    }
  }, [coupon, isOpen, reset]);

  const onFormSubmit = async (data: CouponFormValues) => {
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = coupon ? `/api/admin/coupons/${coupon.id}` : '/api/admin/coupons';
      const method = coupon ? 'PATCH' : 'POST';

      if (data.type === 'free_shipping') {
        data.discount_value = 0;
      }
      if (isUnlimited) {
        data.usage_limit = null;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError('code', { message: 'Coupon code already exists' });
          return;
        }
        throw new Error(result.error || 'Failed to save coupon');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Coupon error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalid = (errors: any) => {
    const firstError = Object.keys(errors)[0];
    const element = document.getElementById(`field-${firstError}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onFormSubmit, handleInvalid)} 
            className="flex flex-col h-full"
          >
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl font-bold">
                {coupon ? 'Edit Coupon' : 'Create Coupon'}
              </DialogTitle>
              {coupon && (
                <DialogDescription className="font-mono text-xs mt-1 bg-muted px-2 py-1 rounded w-fit">
                  Editing: {coupon.code}
                </DialogDescription>
              )}
              {!coupon && (
                <DialogDescription>
                  Create a new discount coupon for your customers.
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="overflow-y-auto max-h-[75vh] px-6 pb-4 space-y-8" ref={formRef}>
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Info</span>
                  <Separator className="flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem id="field-code">
                      <FormLabel className="flex items-center justify-between">
                        Coupon Code
                        {!coupon && (
                          <span className={cn(
                            "text-[10px] font-normal",
                            (couponCode?.length || 0) > 32 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {couponCode?.length || 0}/32
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            disabled={!!coupon}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            placeholder="SUMMER2025"
                            className="font-mono uppercase pr-10"
                            maxLength={32}
                          />
                          {coupon && (
                            <div className="absolute right-3 top-2.5 text-muted-foreground">
                              <Lock className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {coupon && (
                        <FormDescription className="text-[11px] flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Coupon code cannot be changed after creation
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem id="field-type">
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select coupon type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="free_shipping">Free Shipping</SelectItem>
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
                      <FormItem id="field-status" className="flex flex-col justify-end pb-2">
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value === 'active'}
                              onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer">
                            {field.value === 'active' ? 'Active' : 'Inactive'}
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 2: Discount */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discount Settings</span>
                  <Separator className="flex-1" />
                </div>

                {couponType === 'free_shipping' ? (
                  <Alert className="bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs text-primary/80">
                      This coupon waives the shipping fee. No discount value needed.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <FormField
                    control={form.control}
                    name="discount_value"
                    render={({ field }) => (
                      <FormItem id="field-discount_value">
                        <FormLabel>
                          {couponType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₱)'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            placeholder="e.g. 20"
                          />
                        </FormControl>
                        {couponType === 'percentage' && (
                          <FormDescription className="text-[11px]">
                            Enter a value between 1 and 100
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="min_purchase"
                  render={({ field }) => (
                    <FormItem id="field-min_purchase">
                      <FormLabel>Min. Purchase (₱)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormDescription className="text-[11px]">
                        Set to 0 for no minimum
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 3: Limits */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Limits</span>
                  <Separator className="flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="usage_limit"
                    render={({ field }) => (
                      <FormItem id="field-usage_limit">
                        <FormLabel>Usage Limit</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                disabled={isUnlimited}
                                value={isUnlimited ? "" : (field.value ?? "")}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                                placeholder={isUnlimited ? "∞" : "Unlimited"}
                                className={cn(isUnlimited && "bg-muted text-muted-foreground opacity-60")}
                              />
                            </div>
                          </FormControl>
                          <div className="flex items-center space-x-2 shrink-0">
                            <Checkbox 
                              id="unlimited" 
                              checked={isUnlimited}
                              onCheckedChange={(checked) => {
                                setIsUnlimited(!!checked);
                                if (checked) {
                                  field.onChange(null);
                                } else {
                                  setTimeout(() => {
                                    const input = document.getElementById('field-usage_limit')?.querySelector('input');
                                    input?.focus();
                                  }, 0);
                                }
                              }} 
                            />
                            <Label htmlFor="unlimited" className="text-xs font-normal cursor-pointer">Unlimited</Label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="per_user_limit"
                    render={({ field }) => (
                      <FormItem id="field-per_user_limit">
                        <FormLabel>Per User Limit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-[11px]">
                          How many times a single user can use this coupon
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 4: Schedule */}
              <div className="space-y-4 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Schedule</span>
                  <Separator className="flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="starts_at"
                    render={({ field }) => (
                      <FormItem id="field-starts_at" className="flex flex-col">
                        <FormLabel>Start Date + Time</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value ? new Date(field.value) : null}
                            onChange={(date) => field.onChange(date?.toISOString() || null)}
                            placeholder="Pick a date and time"
                            defaultHour={0}
                            defaultMinute={0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expires_at"
                    render={({ field }) => (
                      <FormItem id="field-expires_at" className="flex flex-col">
                        <FormLabel>Expiry Date + Time</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value ? new Date(field.value) : null}
                            onChange={(date) => field.onChange(date?.toISOString() || null)}
                            placeholder="Pick a date and time"
                            defaultHour={23}
                            defaultMinute={45}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 border-t bg-muted/20 sticky bottom-0 z-10 flex items-center justify-between">
              <div />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    coupon ? 'Update Coupon' : 'Create Coupon'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
