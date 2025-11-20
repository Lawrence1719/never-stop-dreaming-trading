"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/lib/context/auth-context";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { Mail, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading, resendConfirmationEmail } = useAuth();
  const searchParams = useSearchParams();
  const { toasts, addToast, removeToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const next = searchParams.get('next');
      if (next) {
        router.push(next);
        return;
      }

      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, authLoading, router, searchParams]);

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

    if (!validateForm()) {
      addToast("Please fix the errors above", "error");
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { error } = await login(trimmedEmail, password);
      
      if (error) {
        const errorMessage = error.message || "";
        if (errorMessage.toLowerCase().includes("email not confirmed") || 
            errorMessage.toLowerCase().includes("email_not_confirmed") ||
            errorMessage.toLowerCase().includes("confirm your email")) {
          setShowResendConfirmation(true);
          addToast("Please confirm your email address before logging in. Check your inbox for the confirmation link.", "error");
        } else {
          addToast(errorMessage || "Login failed. Please try again.", "error");
        }
        return;
      }

      addToast("Logged in successfully", "success");
      setShowResendConfirmation(false);
    } catch (error) {
      addToast("Login failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      addToast("Please enter your email address first", "error");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendConfirmationEmail(email.trim());
      
      if (error) {
        addToast(error.message || "Failed to resend confirmation email. Please try again.", "error");
      } else {
        addToast("Confirmation email sent! Please check your inbox.", "success");
        setShowResendConfirmation(false);
      }
    } catch (error) {
      addToast("Failed to resend confirmation email. Please try again.", "error");
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
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  }}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.email ? "border-destructive" : "border-border"
                  }`}
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
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.password ? "border-destructive" : "border-border"
                  }`}
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
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}