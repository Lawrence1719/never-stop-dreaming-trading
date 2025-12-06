"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { validateEmail, validatePassword, validatePhoneNumber } from "@/lib/utils/validation";
import { User, Mail, Lock, Phone, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in or after successful registration
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required";
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = "Please enter a valid Philippine phone number (e.g., 0912 345 6789)";
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!termsAccepted) {
      newErrors.terms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
  
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Trim email on blur to remove any trailing whitespace
    const trimmedEmail = e.target.value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, email: trimmedEmail }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form - if errors exist, they're already shown in the form fields
    // No need for a toast notification as the errors are visible inline
    const validation = validateForm();
    if (!validation.isValid) {
      // Scroll to first error field for better UX
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
        // Wait a bit for the error state to update and render
        setTimeout(() => {
          const errorElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus();
          }
        }, 50);
      }
      return;
    }

    setIsLoading(true);

    try {
      // Trim email before sending to ensure no whitespace issues
      const trimmedEmail = formData.email.trim().toLowerCase();
      
      const { error } = await register(
        formData.name.trim(),
        trimmedEmail,
        formData.phone.trim(),
        formData.password
      );
      
      if (error) {
        // Show specific error messages based on error type
        let errorMessage = "Registration failed. Please try again.";
        
        if (error.message) {
          if (error.message.includes("already registered") || error.message.includes("already exists")) {
            errorMessage = "This email is already registered. Please use a different email or try logging in.";
          } else if (error.message.includes("password")) {
            errorMessage = "Password is too weak. Please use a stronger password.";
          } else if (error.message.includes("email")) {
            errorMessage = "Invalid email address. Please check and try again.";
          } else {
            errorMessage = error.message;
          }
        }
        
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Success - show success toast
      toast({
        title: "Success",
        description: "Account created successfully! Redirecting...",
      });
      // Redirect will be handled by useEffect when user state updates
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join Never Stop Dreaming Trading</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.name ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.email ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0912 345 6789"
                  autoComplete="tel"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.phone ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              <p className="text-xs text-muted-foreground mt-1">Philippine format: 09XX XXX XXXX or +63 9XX XXX XXXX</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.password ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.confirmPassword ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: "" }));
                }}
                className="mt-1 rounded"
              />
              <span className="text-sm">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms & Conditions
                </Link>
              </span>
            </label>
            {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
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
