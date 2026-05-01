import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
}

export function ReauthModal({ isOpen, onClose, onVerified, email }: ReauthModalProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const res = await fetch('/api/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      if (res.status === 429) {
        throw new Error('Too many attempts. Please try again later.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect password. Please try again.");
      }

      toast({
        title: "Verified",
        description: "Identity confirmed successfully.",
        variant: "success",
      });
      
      setPassword(""); // Clear for security
      onVerified();
    } catch (err: any) {
      console.error('Reauth Password Error:', err);
      const msg = err?.message || "Verification failed. Please try again.";
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-lg relative p-6 border border-border">
        <button
          onClick={() => {
            setPassword("");
            setError("");
            onClose();
          }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isVerifying}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Identity Verification</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Verifying for <span className="font-semibold text-foreground">{email}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please enter your password to confirm this sensitive action.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                type={isVisible ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full pl-4 pr-10 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive text-left pl-1">{error}</p>}
            
            <div className="flex justify-end">
              <Link 
                href="/profile/reset-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full font-semibold"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isVerifying ? "Verifying..." : "Confirm Action"}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setPassword("");
                setError("");
                onClose();
              }}
              disabled={isVerifying}
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
