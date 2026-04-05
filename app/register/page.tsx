"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { validateEmail, validatePassword, validatePhoneNumber, validateName } from "@/lib/utils/validation";
import { User, Mail, Lock, Phone } from 'lucide-react';
import { PasswordInput } from "@/components/ui/PasswordInput";
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

    const firstNameVal = validateName(formData.firstName, "First name");
    if (!firstNameVal.valid) {
      newErrors.firstName = firstNameVal.error || "Invalid first name";
    }

    const lastNameVal = validateName(formData.lastName, "Last name");
    if (!lastNameVal.valid) {
      newErrors.lastName = lastNameVal.error || "Invalid last name";
    }

    if (formData.middleName.trim()) {
      const middleNameVal = validateName(formData.middleName, "Middle name");
      if (!middleNameVal.valid) {
        newErrors.middleName = middleNameVal.error || "Invalid middle name";
      }
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
      newErrors.phone = "Please enter a valid 10-digit Philippine phone number starting with 9 (e.g., 9123456789)";
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
    let newValue = value;
    if (name === "phone") {
      newValue = value.replace(/\D/g, "");
    }
    setFormData((prev) => ({ ...prev, [name]: newValue }));

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

    if (name === "firstName" || name === "middleName" || name === "lastName") {
      if (name === "middleName" && !value.trim()) {
        setErrors((prev) => ({ ...prev, middleName: "" }));
      } else {
        const fieldDisplayName = name === "firstName" ? "First name" : name === "middleName" ? "Middle name" : "Last name";
        const result = validateName(value, fieldDisplayName);
        setErrors((prev) => ({ 
          ...prev, 
          [name]: result.valid ? "" : (result.error || "") 
        }));
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
                  <div className="flex flex-col gap-1 w-full">
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
                    {errors.firstName && (
                      <p className="text-[10px] text-destructive ml-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleChange}
                        placeholder="Middle (optional)"
                        className={`w-full pl-10 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.middleName ? "border-destructive" : "border-border"}`}
                      />
                    </div>
                    {errors.middleName && (
                      <p className="text-[10px] text-destructive ml-1">{errors.middleName}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-full">
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
                    {errors.lastName && (
                      <p className="text-[10px] text-destructive ml-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
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
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <div className="absolute left-10 top-3 flex items-center gap-1.5 text-sm text-muted-foreground pointer-events-none">
                    <span role="img" aria-label="PH flag">🇵🇭</span>
                    <span>+63</span>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    pattern="\d*"
                    placeholder="9123456789"
                    autoComplete="tel"
                    className={`w-full pl-24 pr-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${errors.phone ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`pl-10 ${errors.password ? "border-destructive" : "border-border"}`}
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <PasswordInput
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`pl-10 ${errors.confirmPassword ? "border-destructive" : "border-border"}`}
                  />
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
