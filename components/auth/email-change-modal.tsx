'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { changeEmailAction } from "@/app/profile/settings/actions";

const emailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  confirmEmail: z.string().email("Invalid email address"),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Emails do not match",
  path: ["confirmEmail"],
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

export function EmailChangeModal({ isOpen, onClose, currentEmail }: EmailChangeModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
    },
  });

  const onSubmit = async (data: EmailFormValues) => {
    if (data.newEmail === currentEmail) {
      toast({
        title: "Error",
        description: "New email must be different from current email.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changeEmailAction(data.newEmail);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Your email has been changed successfully. Notifications have been sent to both your old and new addresses.",
        variant: "success",
      });
      
      reset();
      onClose();
      // Force refresh to update UI
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to change email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-lg relative p-6 border border-border">
        <button
          onClick={() => {
            reset();
            onClose();
          }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Change Email Address</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your new email address below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">New Email</label>
            <input
              {...register("newEmail")}
              type="email"
              placeholder="Enter new email"
              className={`w-full px-4 py-3 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.newEmail ? "border-destructive" : "border-border"}`}
              disabled={isSubmitting}
            />
            {errors.newEmail && <p className="text-xs text-destructive ml-1">{errors.newEmail.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Confirm New Email</label>
            <input
              {...register("confirmEmail")}
              type="email"
              placeholder="Confirm new email"
              className={`w-full px-4 py-3 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${errors.confirmEmail ? "border-destructive" : "border-border"}`}
              disabled={isSubmitting}
            />
            {errors.confirmEmail && <p className="text-xs text-destructive ml-1">{errors.confirmEmail.message}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSubmitting ? "Updating..." : "Update Email"}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={isSubmitting}
              className="font-normal text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
