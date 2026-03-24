"use client";

import { useState, Suspense } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/lib/context/auth-context";
import { useCart } from "@/lib/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { Mail, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from "next-themes";
import { Logo } from "@/components/ui/logo";

function LoginPageContent() {
  const router = useRouter();
  const { login, user, isLoading: authLoading, resendConfirmationEmail } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    // Reset form state on mount
    setEmail("");
    setPassword("");
    setErrors({});
  }, []);

  const { isMigrating } = useCart();

  // Redirect if already logged in; wait for cart migration to finish so migrated
  // items are available in the user's cart before redirecting to `next`.
  useEffect(() => {
    // Allow admin users to redirect immediately (they don't need cart migration)
    const migrationDoneOrAdmin = !isMigrating || (user && user.role === 'admin');

    if (!authLoading && user && migrationDoneOrAdmin && !justLoggedIn) {
      const next = searchParams.get('next');
      if (next) {
        router.push(next);
        return;
      }

      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, authLoading, isMigrating, router, searchParams, justLoggedIn]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required";
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If session is already recovered, just redirect
    if (user) {
      router.push('/');
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors above",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      const trimmedEmail = email.trim().toLowerCase();
      console.log('Attempting login with email:', trimmedEmail);

      const { error } = await login(trimmedEmail, password);

      console.log('Login result:', { error });

      if (error) {
        const errorMessage = error.message || "Invalid email or password";
        console.error('Login error:', errorMessage);

        // Set form error
        setErrors({ form: errorMessage });

        if (errorMessage.toLowerCase().includes("email not confirmed") ||
          errorMessage.toLowerCase().includes("email_not_confirmed") ||
          errorMessage.toLowerCase().includes("confirm your email")) {
          setShowResendConfirmation(true);
          toast({
            title: "Email Not Confirmed",
            description: "Please confirm your email address before logging in. Check your inbox for the confirmation link.",
            variant: "destructive",
          });
        } else if (errorMessage.toLowerCase().includes("invalid") ||
          errorMessage.toLowerCase().includes("credentials") ||
          errorMessage.toLowerCase().includes("password")) {
          // Fix: Do not show resend confirmation for generic invalid credentials
          toast({
            title: "Invalid Credentials",
            description: "The email or password you entered is incorrect. Please try again or click Forgot Password if you need to reset it.",
            variant: "destructive",
          });
          setShowResendConfirmation(false); 
        } else {
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
          setShowResendConfirmation(false);
        }
        return;
      }

      setJustLoggedIn(true);
      toast({
        title: "Success",
        description: "Logged in successfully",
        variant: "success",
      });
      setShowResendConfirmation(false);

      // Delay to ensure toast is visible before redirect
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Clear the flag to allow useEffect to handle redirect
      setJustLoggedIn(false);
    } catch (error) {
      console.error('Unexpected login error:', error);
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred";
      setErrors({ form: errorMsg });
      toast({
        title: "Login Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendConfirmationEmail(email.trim());

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to resend confirmation email. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Sent",
          description: "Confirmation email sent! Please check your inbox.",
          variant: "success",
        });
        setShowResendConfirmation(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend confirmation email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Logo variant="long" className="h-16 w-auto" priority />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* General Form Error */}
            {errors.form && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive font-medium">{errors.form}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                    if (errors.form) setErrors((prev) => ({ ...prev, form: "" }));
                  }}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.email ? "border-destructive" : "border-border"
                    }`}
                  autoComplete="off"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                    if (errors.form) setErrors((prev) => ({ ...prev, form: "" }));
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.password ? "border-destructive" : "border-border"
                    }`}
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Email Not Confirmed Message */}
          {showResendConfirmation && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Your email address hasn't been confirmed yet. Please check your inbox for the confirmation link.
              </p>
              <button
                onClick={handleResendConfirmation}
                disabled={isResending}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? "Sending..." : "Resend Confirmation Email"}
              </button>
            </div>
          )}

          {/* Signup Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Sign up here
            </Link>
          </p>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}