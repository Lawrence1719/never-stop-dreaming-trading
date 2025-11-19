  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from 'next/navigation';
  import Link from "next/link";
  import { Navbar } from "@/components/layout/navbar";
  import { Footer } from "@/components/layout/footer";
  import { useAuth } from "@/lib/context/auth-context";
  import { useToast } from "@/components/ui/toast";
  import { validatePhoneNumber } from "@/lib/utils/validation";
  import { ChevronLeft } from 'lucide-react';

  export default function EditProfilePage() {
    const router = useRouter();
    const { user, updateProfile, isLoading: authLoading } = useAuth();
    const { toasts, addToast, removeToast } = useToast();

    const [formData, setFormData] = useState({
      name: user?.name || "",
      phone: user?.phone || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

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
        newErrors.phone = "Please enter a valid Philippine phone number (e.g., 0912 345 6789)";
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
        await new Promise((resolve) => setTimeout(resolve, 500));
        updateProfile(formData.name, formData.phone);
        addToast("Profile updated successfully", "success");
        router.push("/profile");
      } catch (error) {
        addToast("Update failed", "error");
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
                <label className="block text-sm font-medium mb-2">Email (Read-only)</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder="0912 345 6789"
                  autoComplete="tel"
                  className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.phone ? "border-destructive" : "border-border"
                  }`}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                <p className="text-xs text-muted-foreground mt-1">Philippine format: 09XX XXX XXXX or +63 9XX XXX XXXX</p>
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
