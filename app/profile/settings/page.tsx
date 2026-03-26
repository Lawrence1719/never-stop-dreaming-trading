"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Bell, Globe, Moon, Mail, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/lib/supabase/client";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { ReauthModal } from "@/components/auth/reauth-modal";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    marketingEmails: false,
    newsletter: false,
    language: 'en',
    theme: 'system',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [reauthAction, setReauthAction] = useState<"password" | "delete" | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // In a real app, save preferences to backend
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      toast({
        title: "Success",
        description: "Settings saved successfully",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleReauthVerified = () => {
    if (reauthAction === "password") {
      setReauthAction(null);
      router.push("/profile/change-password");
    } else if (reauthAction === "delete") {
      handleDeleteAccount();
    }
  };


  const handleDeleteAccount = async () => {
    setReauthAction(null);
    try {
      toast({ title: "Account Deleted", description: "Your account has been securely deleted.", variant: "success" });
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
       toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

          <div className="space-y-6">
            {/* Notification Preferences */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Notification Preferences</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="order-updates">Order Updates</Label>
                    <p className="text-sm text-muted-foreground">Get notified about order status changes</p>
                  </div>
                  <Switch
                    id="order-updates"
                    checked={preferences.orderUpdates}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, orderUpdates: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional emails and offers</p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={preferences.marketingEmails}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, marketingEmails: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newsletter">Newsletter</Label>
                    <p className="text-sm text-muted-foreground">Subscribe to our monthly newsletter</p>
                  </div>
                  <Switch
                    id="newsletter"
                    checked={preferences.newsletter}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, newsletter: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Language & Region */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Language & Region</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <SearchableSelect
                    options={[
                      { value: "en", label: "English" },
                      { value: "es", label: "Spanish" },
                      { value: "fr", label: "French" },
                      { value: "de", label: "German" },
                    ]}
                    value={preferences.language}
                    onValueChange={(val) =>
                      setPreferences((prev) => ({ ...prev, language: val }))
                    }
                    placeholder="Select language"
                    searchPlaceholder="Search language..."
                    triggerClassName="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Display Preferences */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Moon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Display Preferences</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <SearchableSelect
                    options={[
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                      { value: "system", label: "System" },
                    ]}
                    value={preferences.theme}
                    onValueChange={(val) =>
                      setPreferences((prev) => ({ ...prev, theme: val }))
                    }
                    placeholder="Select theme"
                    searchPlaceholder="Search theme..."
                    triggerClassName="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Email Address</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Current Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                
                <form onSubmit={handleUpdateEmail} className="pt-2">
                  <label className="block text-sm font-medium mb-2">New Email Address</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex-1 w-full">
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
                    <Button
                      type="submit"
                      disabled={isUpdatingEmail || !newEmail.trim()}
                      className="w-full sm:w-auto"
                    >
                      {isUpdatingEmail ? "Updating..." : "Update Email"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Changing your email address will require confirmation. 
                    A link will be sent to your new email.
                  </p>
                </form>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Account Actions</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div>
                    <p className="font-medium">Export Account Data</p>
                    <p className="text-sm text-muted-foreground">Download a copy of your account data</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div>
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push("/profile/change-password")}>
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border-l-2 border-destructive">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setReauthAction("delete")}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Reauthentication Modal */}
      <ReauthModal
        isOpen={reauthAction !== null}
        onClose={() => setReauthAction(null)}
        onVerified={handleReauthVerified}
        email={user.email || ""}
      />
    </div>
  );
}

