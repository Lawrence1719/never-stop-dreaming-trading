"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validateEmail(email)) {
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      login(email, password);
      addToast("Logged in successfully", "success");
      router.push("/");
    } catch (error) {
      addToast("Login failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Signup Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Sign up here
            </Link>
          </p>

          {/* Demo Info */}
          <div className="mt-8 p-4 bg-secondary/10 rounded-lg border border-secondary">
            <p className="text-xs font-medium text-center mb-2">Demo Credentials</p>
            <p className="text-xs text-muted-foreground text-center">
              Any email and password with at least 6 characters will work!
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
