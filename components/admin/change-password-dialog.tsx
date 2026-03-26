'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { requestPasswordReset, user } = useAuth();
  const { toast } = useToast();
  
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendVerification = async () => {
    setError('');
    setIsSending(true);
    try {
      const { error } = await requestPasswordReset();

      if (error) throw error;

      setIsSent(true);
      toast({
        title: "Verification Sent",
        description: `A verification link has been sent to ${user?.email}.`,
        variant: "success",
      });
    } catch (error: any) {
      console.error('Failed to send verification email', error);
      setError(error.message || 'Failed to send verification email');
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a delay to allow for close animation
    setTimeout(() => {
      setIsSent(false);
      setError('');
    }, 300)
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            {isSent 
              ? "Check your email for the verification link." 
              : "For security reasons, we need to verify your identity before you can change your password."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
          {isSent ? (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Verification Email Sent!</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  We've sent a link to <span className="font-semibold text-foreground">{user?.email}</span>.{"\n"}
                  Please click the link in the email to set your new password.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                We will send a secure verification link to your registered email address.
              </p>
            </>
          )}
        </div>
        
        {error && (
          <p className="text-sm font-medium text-destructive text-center">
            {error}
          </p>
        )}

        <DialogFooter className="sm:justify-center">
          {isSent ? (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendVerification} 
                className="flex-1"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Link'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
