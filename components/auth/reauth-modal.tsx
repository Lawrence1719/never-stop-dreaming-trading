import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailOtpType } from "@supabase/supabase-js";

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
}

export function ReauthModal({ isOpen, onClose, onVerified, email }: ReauthModalProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const sentRef = useRef(false);
  useEffect(() => {
    if (isOpen && !sentRef.current) {
      setOtp("");
      setError("");
      sentRef.current = true;
      sendOtp();
    }
    if (!isOpen) {
      sentRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendOtp = async () => {
    setIsSending(true);
    setError("");
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) {
        throw error;
      }
      toast({
        title: "Code Sent",
        description: "A verification code has been sent to your email.",
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send code";
      setError(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6 || otp.length > 8) {
      setError("Please enter a valid verification code");
      return;
    }

    setIsVerifying(true);
    setError("");

    console.log('Verifying OTP...', { email: email.toLowerCase(), token: otp });
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: otp,
        type: 'reauthentication' as EmailOtpType, 
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Verified",
        description: "Secure action authorized.",
        variant: "success",
      });
      onVerified();
    } catch (err: any) {
      console.error('Reauth Full Error:', err);
      const msg = err?.message || "Invalid or expired code";
      const details = err?.status === 403 ? "Supabase security might be blocking multiple attempts (403). Please wait 15-30 minutes and try again." : msg;
      setError(details);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-lg relative p-6 border border-border">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isVerifying || isSending}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-2">Security Verification</h2>
        <p className="text-sm text-muted-foreground mb-6">
          To continue this secure action, please enter the verification code we just sent to your email.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={8}
              placeholder="00000000"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              className="w-full text-center text-3xl tracking-[0.5em] px-4 py-4 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
            {error && <p className="text-sm text-destructive mt-2 text-center">{error}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isVerifying || otp.length < 6 || isSending}
              className="w-full font-semibold"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>

            <button
              type="button"
              onClick={sendOtp}
              disabled={isSending || isVerifying}
              className="text-sm text-primary hover:underline disabled:opacity-50 transition-all"
            >
              {isSending ? "Sending code..." : "Resend code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
