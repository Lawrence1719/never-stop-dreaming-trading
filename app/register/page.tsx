"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { validateEmail, validatePassword, validatePhoneNumber } from "@/lib/utils/validation";
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { Logo } from "@/components/ui/logo";
import { useSettings } from "@/lib/hooks/use-settings";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading: authLoading, resendConfirmationEmail } = useAuth();
  const { toast } = useToast();
  const { settings, isLoading: settingsLoading } = useSettings();

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | "">("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Reset form state on mount
  useEffect(() => {
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
    setTermsAccepted(false);
    setErrors({});
    setPasswordStrength("");
  }, []);

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

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
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

    if (name === "password") {
      const length = value.length;
      if (!value) {
        setPasswordStrength("");
      } else if (length < 6) {
        setPasswordStrength("weak");
      } else if (length < 10) {
        setPasswordStrength("medium");
      } else {
        setPasswordStrength("strong");
      }
    }

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

    const validation = validateForm();
    if (!validation.isValid) {
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
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
      const trimmedEmail = formData.email.trim().toLowerCase();

      const fullName = [formData.firstName, formData.middleName, formData.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ");

      const { error } = await register(
        fullName,
        trimmedEmail,
        formData.phone.trim(),
        formData.password
      );

      if (error) {
        let errorMessage = "Registration failed. Please try again.";

        if (error.message) {
          const lowerMsg = error.message.toLowerCase();
          if (lowerMsg.includes("already registered") || lowerMsg.includes("already exists")) {
            errorMessage = "This email is already registered. Please use a different email or try logging in.";
          } else if (lowerMsg.includes("password")) {
            errorMessage = "Password is too weak. Please use a stronger password.";
          } else if (lowerMsg.includes("email")) {
            errorMessage = "Invalid email address or provider error.";
          } else if (lowerMsg.includes("smtp") || lowerMsg.includes("configuration") || lowerMsg.includes("mail")) {
            errorMessage = "Email delivery failed. Please contact support.";
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

      setIsSuccess(true);
      toast({
        title: "Check your email",
        description: "Please check your email to confirm your account before logging in.",
        variant: "success",
      });
    } catch (error) {
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

  const handleResendEmail = async () => {
    setIsResending(true);
    const { error } = await resendConfirmationEmail(formData.email);
    setIsResending(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend email.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email Sent",
        description: "Confirmation email sent! Please check your inbox.",
        variant: "success",
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Check your email</h1>
            <p className="text-muted-foreground mb-8">
              We've sent a confirmation link to <span className="font-semibold text-foreground">{formData.email}</span>. Please click the link to verify your account before logging in.
            </p>
            <div className="space-y-4">
              <Link
                href="/login"
                className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Go to Login
              </Link>
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? "Sending..." : "Resend confirmation email"}
              </button>
            </div>
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
        {settingsLoading ? (
          <div className="w-full max-w-xl text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-muted-foreground animate-pulse">Loading settings...</p>
          </div>
        ) : settings?.system.enableCustomerRegistration === false ? (
          <div className="w-full max-w-xl text-center space-y-8 p-12 bg-card border border-border rounded-2xl shadow-xl">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-amber-500/10 rounded-full">
                <User className="w-16 h-16 text-amber-500" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight">Registration Disabled</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                New customer registrations are currently suspended. Please contact us if you need assistance or try again later.
              </p>
            </div>
            <div className="flex gap-4 justify-center pt-8">
              <Link
                href="/login"
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20"
              >
                Go to Login
              </Link>
              <Link
                href="/"
                className="px-8 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all font-bold"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <Logo variant="long" className="h-16 w-auto" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Create Account</h1>
              <p className="text-muted-foreground">Join {settings?.general.storeName || 'Never Stop Dreaming Trading'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First"
                      className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.firstName ? "border-destructive" : "border-border"}`}
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      placeholder="Middle (optional)"
                      className="w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-border"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last"
                      className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.lastName ? "border-destructive" : "border-border"}`}
                    />
                  </div>
                </div>
                {(errors.firstName || errors.lastName) && (
                  <p className="text-xs text-destructive mt-1">{errors.firstName || errors.lastName}</p>
                )}
              </div>

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
                    autoComplete="off"
                    className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.email ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <span className="ml-9 mr-2 text-sm text-muted-foreground whitespace-nowrap">+63</span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="912 345 6789"
                    autoComplete="tel"
                    className={`w-full pl-2 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.phone ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-10 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.password ? "border-destructive" : "border-border"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-10 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.confirmPassword ? "border-destructive" : "border-border"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: "" }));
                  }}
                  className="mt-1 h-4 w-4 rounded border border-border text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-semibold">Sign in here</Link>
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
