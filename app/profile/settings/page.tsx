"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Bell, Globe, Moon, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    marketingEmails: false,
    newsletter: false,
    language: 'en',
    theme: 'system',
  });

  const [isLoading, setIsLoading] = useState(false);

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
      addToast("Settings saved successfully", "success");
    } catch (error) {
      addToast("Failed to save settings", "error");
    } finally {
      setIsLoading(false);
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
                  <select
                    id="language"
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, language: e.target.value }))
                    }
                    className="w-full mt-2 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
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
                  <select
                    id="theme"
                    value={preferences.theme}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, theme: e.target.value }))
                    }
                    className="w-full mt-2 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-5 h-5 text-primary" />
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
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm">
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
    </div>
  );
}

