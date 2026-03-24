"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/validation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | "">("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handlePasswordChange = (val: string) => {
    setNewPassword(val);
    if (!val) {
      setPasswordStrength("");
    } else if (val.length < 6) {
      setPasswordStrength("weak");
    } else if (val.length < 10) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePassword(newPassword)) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
        variant: "success",
      });

      // Redirect back to settings after a short delay
      setTimeout(() => {
        router.push("/profile/settings");
      }, 1500);

    } catch (err: any) {
      const msg = err?.message || "Failed to update password. Please try again.";
      setError(msg);
      toast({
        title: "Update Failed",
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Settings
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Change Password</h1>
            <p className="text-muted-foreground">Set a new secure password for your account</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      error.includes("match") || error.includes("characters") ? "border-destructive" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
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
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                      Strength: {passwordStrength}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      error.includes("match") ? "border-destructive" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-6 text-base font-bold shadow-lg shadow-primary/20"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                You will be redirected to settings after a successful update.
              </p>
            </form>
          </div>

          <div className="mt-8 p-4 bg-secondary/10 rounded-lg border border-border/50">
            <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Security Note
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you have forgotten your password entirely, please log out and use the 
              <strong> "Forgot Password"</strong> link on the login page to receive a recovery email.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
