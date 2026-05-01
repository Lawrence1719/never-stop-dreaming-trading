"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { validatePassword, validatePasswordStrength } from "@/lib/utils/validation";
import { Lock, UserCircle } from 'lucide-react';
import { PasswordInput } from "@/components/ui/PasswordInput";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/context/auth-context";
import { Logo } from "@/components/ui/logo";

function ResetPasswordContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fix: Use status-driven loading to wait for the auth session
  useEffect(() => {
    // 1. Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[reset-password] Auth event: ${event}`, { hasSession: !!session });
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready');
        if (session.user.email) setResetEmail(session.user.email);
      } else if (session) {
        // Fallback for cases where it's SIGNED_IN but we're on the reset page
        setStatus('ready');
        if (session.user.email) setResetEmail(session.user.email);
      }
    });

    // 2. Also check if session already exists (e.g. on page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('ready');
        if (session.user.email) setResetEmail(session.user.email);
      }
    });

    // 3. Timeout fallback — after 6s show error if still loading
    const timeout = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'loading') {
          console.error('[reset-password] Auth session timeout (6s)');
          return 'error';
        }
        return prev;
      });
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "password") {
      setPassword(value);
      const val = validatePasswordStrength(value);
      if (!value) {
        setPasswordStrength("");
      } else if (!val.valid) {
        // If length is okay but missing other rules, call it medium
        if (value.length >= 8) {
          setPasswordStrength("medium");
        } else {
          setPasswordStrength("weak");
        }
      } else {
        setPasswordStrength("strong");
      }
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (errors.form) setErrors((prev) => ({ ...prev, form: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const passwordVal = validatePasswordStrength(password);
    if (!passwordVal.valid) {
      newErrors.password = passwordVal.error || "Invalid password";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.status === 429) {
        setErrors({ form: 'Too many attempts. Please try again later.' });
        toast({
          title: "Error",
          description: 'Too many attempts. Please try again later.',
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error || 'Failed to update password' });
        toast({
          title: "Error",
          description: data.error || 'Failed to update password',
          variant: "destructive",
        });
      } else {
        // Force sign out immediately to prevent automatic login
        await supabase.auth.signOut();

        toast({
          title: "Success",
          description: "Password updated successfully!",
          variant: "success",
        });
        
        // Short delay before redirecting to login
        setTimeout(() => {
          router.replace('/login?reset=success');
        }, 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrors({ form: msg });
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const AuthHeader = () => (
    <header className="p-6">
      <Link href="/" className="inline-block">
        <Logo variant="square" priority />
      </Link>
    </header>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {status === 'loading' ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground animate-pulse">Establishing secure connection...</p>
            </div>
          ) : status === 'error' ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Link Expired or Invalid</h1>
                <p className="text-muted-foreground">
                  This password reset link is no longer valid or has already been used.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="inline-block px-8 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Request New Link
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
                {resetEmail && (
                  <div className="flex items-center justify-center gap-2 text-primary bg-primary/5 py-2 px-4 rounded-full w-fit mx-auto mb-4 border border-primary/10">
                    <UserCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Resetting for: {resetEmail}</span>
                  </div>
                )}
                <p className="text-muted-foreground">Please enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {errors.form && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-sm text-destructive font-medium">{errors.form}</p>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <PasswordInput
                      name="password"
                      value={password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`pl-10 ${
                        errors.password ? "border-destructive" : "border-border"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Requirements: 8+ chars, Uppercase, Lowercase, Number, Symbol
                  </p>
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordStrength === "weak"
                              ? "w-1/3 bg-destructive"
                              : passwordStrength === "medium"
                              ? "w-2/3 bg-amber-500"
                              : "w-full bg-emerald-500"
                          }`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        Password strength: {passwordStrength}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <PasswordInput
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`pl-10 ${
                        errors.confirmPassword ? "border-destructive" : "border-border"
                      }`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {isLoading ? "Updating Password..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
