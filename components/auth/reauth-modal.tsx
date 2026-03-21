import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setError("");
      sendOtp();
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
        description: "A 6-digit code has been sent to your email.",
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
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'reauthentication' as EmailOtpType, // Cast to avoid TS complaining if type is not strictly in standard types
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code";
      // We explicitly override the message as per instructions
      setError("Invalid or expired code");
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
          To continue this secure action, please enter the 6-digit code we just sent to your email.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
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
              disabled={isVerifying || otp.length !== 6 || isSending}
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
