"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, LockKeyhole, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useToast } from "@/hooks/use-toast";
import { validateEmail } from "@/lib/utils/validation";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (res.status === 429) {
        throw new Error('Too many attempts. Please try again later.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSubmitted(true);
      toast({
        title: "Email Sent",
        description: "Please check your email for the reset link.",
        variant: "success",
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      toast({
        title: "Request Failed",
        description: err?.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {!submitted ? (
            <>
              {/* Logo Area */}
              <div className="flex justify-center mb-6">
                <Logo variant="square" className="h-12 w-12" priority />
              </div>

              {/* Icon & Title */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LockKeyhole className="w-8 h-8 text-cyan-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Reset Password</h1>
                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                  Enter your email to receive a password reset link
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    <Mail className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-2 group">
                  <label htmlFor="email" className="text-sm font-semibold ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                        error ? "text-destructive" : "text-muted-foreground group-focus-within:text-cyan-500"
                      }`}
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="you@example.com"
                      className={`w-full h-11 pl-10 pr-4 bg-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all ${
                        error ? "border-destructive ring-destructive/10" : "border-border"
                      }`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 font-bold" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Check your email</h2>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed max-w-[280px] mx-auto">
                We've sent a password reset link to <span className="font-bold text-foreground">{email}</span>
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="w-full py-3 px-4 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors"
              >
                Try different email
              </button>
            </div>
          )}

          {/* Footer Link */}
          <div className="mt-8 text-center border-t border-border/50 pt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-600 font-bold transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
