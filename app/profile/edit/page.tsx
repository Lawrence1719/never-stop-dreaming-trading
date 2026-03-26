  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from 'next/navigation';
  import Link from "next/link";
  import { Navbar } from "@/components/layout/navbar";
  import { Footer } from "@/components/layout/footer";
  import { useAuth } from "@/lib/context/auth-context";
  import { useToast } from "@/hooks/use-toast";
  import { validatePhoneNumber, validateEmail } from "@/lib/utils/validation";
  import { ChevronLeft } from 'lucide-react';
  import { supabase } from "@/lib/supabase/client";

  export default function EditProfilePage() {
    const router = useRouter();
    const { user, updateProfile, isLoading: authLoading } = useAuth();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
      name: user?.name || "",
      phone: user?.phone || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    useEffect(() => {
      if (!authLoading && !user) {
        router.push("/login");
      }
    }, [user, authLoading, router]);

    useEffect(() => {
      if (user) {
        setFormData({
          name: user.name || "",
          phone: user.phone || "",
        });
      }
    }, [user]);

    if (authLoading) {
      return (
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    if (!user) {
      return null;
    }

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!formData.name.trim()) {
        newErrors.name = "Name is required";
      }

      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!validatePhoneNumber(formData.phone)) {
        newErrors.phone = "Please enter a valid 10-digit Philippine phone number starting with 9 (e.g., 9123456789)";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleUpdateEmail = async () => {
      setEmailError("");
      
      const trimmedEmail = newEmail.trim().toLowerCase();
      if (!trimmedEmail) {
        setEmailError("Email address is required");
        return;
      }
      if (!validateEmail(trimmedEmail)) {
        setEmailError("Please enter a valid email address");
        return;
      }
      if (user && trimmedEmail === user.email) {
        setEmailError("This is already your current email address");
        return;
      }
  
      setIsUpdatingEmail(true);
  
      try {
        const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (error) {
          setEmailError(error.message);
          toast({
            title: "Update Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setNewEmail("");
          setIsChangingEmail(false);
          toast({
            title: "Confirmation Link Sent",
            description: "A confirmation link has been sent to your new email address. Please check your inbox to confirm the change.",
            variant: "success",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setEmailError(msg);
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setIsUpdatingEmail(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors above",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      try {
        const { error } = await updateProfile(formData.name, formData.phone);
        
        if (error) {
          toast({
            title: "Update Failed",
            description: error.message || "Failed to update profile. Please try again.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Profile updated successfully",
          variant: "success",
        });
        
        // Small delay to show the success message before redirecting
        setTimeout(() => {
          router.push("/profile");
        }, 500);
      } catch (error) {
        console.error("Profile update error:", error);
        toast({
          title: "Update Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-primary hover:underline mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.name ? "border-destructive" : "border-border"
                  }`}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                {!isChangingEmail ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="flex-1 px-4 py-2 bg-input border border-border rounded-lg opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setIsChangingEmail(true)}
                      className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium whitespace-nowrap"
                    >
                      Change Email
                    </button>
                  </div>
                ) : (
                  <div className="bg-secondary/10 border border-border rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-muted-foreground">Current Email</label>
                      <p className="text-sm font-medium">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        placeholder="new@example.com"
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                          emailError ? "border-destructive" : "border-border"
                        }`}
                      />
                      {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingEmail(false);
                          setNewEmail("");
                          setEmailError("");
                        }}
                        className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary/20 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateEmail}
                        disabled={isUpdatingEmail || !newEmail.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingEmail ? "Sending..." : "Send Confirmation"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-sm text-muted-foreground pointer-events-none">
                  <span role="img" aria-label="PH flag">🇵🇭</span>
                  <span>+63</span>
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const newValue = e.target.value.replace(/\D/g, "");
                    setFormData((prev) => ({ ...prev, phone: newValue }));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  maxLength={10}
                  pattern="\d*"
                  placeholder="9123456789"
                  autoComplete="tel"
                  className={`w-full pl-16 px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.phone ? "border-destructive" : "border-border"
                  }`}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              <p className="text-xs text-muted-foreground mt-1">Philippine format: 9XXXXXXXXX (Exactly 10 digits)</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    );
  }
