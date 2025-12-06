"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { validateEmail } from "@/lib/utils/validation";
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitted(true);
      addToast("Check your email for reset link", "success");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      addToast("Request failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="bg-secondary/10 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                The reset link will expire in 1 hour. If you don't receive an email, check your spam folder.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-block px-8 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Back to Login
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">Enter your email to receive a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    error ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign in here
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
