"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as any;
  const email = searchParams.get("email");

  const handleVerify = async () => {
    if (!token_hash || !type || !email) {
      setError("Invalid verification link. Some parameters are missing.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
        email,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: "Success",
        description: "Your email has been verified successfully.",
        variant: "success",
      });

      // Redirect to profile after a short delay
      setTimeout(() => {
        router.push("/profile?message=Email changed successfully");
      }, 2000);
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Failed to verify email. The link may have expired.");
      toast({
        title: "Verification Failed",
        description: err.message || "Failed to verify email.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
          {success ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold">Email Verified!</h1>
              <p className="text-muted-foreground">
                Your email has been updated successfully. Redirecting you to your profile...
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </div>
          ) : error ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold">Verification Error</h1>
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground">
                This link may have expired or already been used. Please try requesting a new email change.
              </p>
              <button
                onClick={() => router.push("/profile/edit")}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Go Back to Profile
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Confirm Email Change</h1>
                <p className="text-muted-foreground">
                  Please click the button below to complete your email verification and update your account.
                </p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg text-sm break-all border border-border">
                <span className="text-muted-foreground block mb-1">New Email:</span>
                <span className="font-semibold text-foreground">{email}</span>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Confirm & Verify Email"
                )}
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
