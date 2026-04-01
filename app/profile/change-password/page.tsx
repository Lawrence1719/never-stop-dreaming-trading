"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, requestCustomerPasswordReset } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleRequestReset = async () => {
    setError("");
    setIsLoading(true);

    try {
      const { error: resetError } = await requestCustomerPasswordReset();

      if (resetError) {
        throw resetError;
      }

      setIsSent(true);
      toast({
        title: "Link Sent",
        description: `A verification link has been sent to ${user?.email}.`,
        variant: "success",
      });

    } catch (err: any) {
      const msg = err?.message || "Failed to send verification link. Please try again.";
      setError(msg);
      toast({
        title: "Request Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-md mx-auto px-4 py-12">
          <Link
            href="/profile"
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Profile
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Change Password</h1>
            <p className="text-muted-foreground">Secure your account by verifying your email</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center">
            {isSent ? (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">Verification Email Sent!</h2>
                  <p className="text-muted-foreground">
                    We've sent a secure link to <span className="font-semibold text-foreground">{user.email}</span>.
                    Please check your inbox and click the link to set your new password.
                  </p>
                </div>
                <Button 
                  onClick={() => router.push('/profile/settings')} 
                  variant="outline"
                  className="w-full"
                >
                  Back to Settings
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    To change your password, we'll send a verification link to your registered email address. This step ensures only you can update your account security.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleRequestReset}
                  className="w-full py-6 text-base font-bold shadow-lg shadow-primary/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Verification Link"
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-secondary/10 rounded-lg border border-border/50">
            <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Security Note
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The verification link will expire in 1 hour. If you don't receive the email, please check your spam folder or request a new link.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
