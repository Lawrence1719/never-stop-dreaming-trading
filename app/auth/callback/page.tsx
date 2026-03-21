"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const hasShownToast = useRef(false);

  useEffect(() => {
    // Check if there's an error in the URL (e.g. invalid link, expired token)
    const errorDesc = searchParams.get('error_description');
    if (errorDesc) {
      setError(errorDesc);
      return;
    }

    // If user state is populated, we are successfully logged in.
    if (user && !hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Success",
        description: "Email confirmed! Welcome to Never Stop Dreaming Trading 🎉",
        variant: "success",
      });
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    }

    // We also give it a timeout just in case the link was invalid 
    // but didn't return an explicit error_description.
    const timeout = setTimeout(() => {
      if (!user) {
        // Assume failure or already processed
        router.replace('/login');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [user, router, searchParams, toast]);

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-destructive mb-6">{error}</p>
        <button
          onClick={() => router.replace('/login')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <h1 className="text-2xl font-bold mb-2">Verifying your account...</h1>
      <p className="text-muted-foreground">Please wait while we confirm your email.</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={
        <div className="flex flex-col flex-1 items-center justify-center p-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
