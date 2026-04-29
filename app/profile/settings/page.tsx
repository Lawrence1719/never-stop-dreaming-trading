"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useTheme } from "next-themes";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Bell, Globe, Moon, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/validation";
import { ReauthModal } from "@/components/auth/reauth-modal";
import { EmailChangeModal } from "@/components/auth/email-change-modal";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, updatePreferences, restoreAccount } = useAuth();
  const { theme, setTheme } = useTheme();
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
  const [reauthAction, setReauthAction] = useState<"password" | "delete" | "email" | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    
    if (user?.notification_preferences) {
      setPreferences(prev => ({
        ...prev,
        ...user.notification_preferences,
        // Also sync theme if it's in the profile
        theme: (user.notification_preferences as any).theme || theme || 'system'
      }));
      
      // If profile has a theme, apply it globally
      if ((user.notification_preferences as any).theme) {
        setTheme((user.notification_preferences as any).theme);
      }
    }
  }, [user, authLoading, router, setTheme]);

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
      const { error } = await updatePreferences({
        emailNotifications: preferences.emailNotifications,
        orderUpdates: preferences.orderUpdates,
        marketingEmails: preferences.marketingEmails,
        newsletter: preferences.newsletter,
        // @ts-ignore - theme is part of our extended preferences
        theme: preferences.theme
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauthVerified = () => {
    if (reauthAction === "password") {
      setReauthAction(null);
      router.push("/profile/change-password");
    } else if (reauthAction === "email") {
      setReauthAction(null);
      setIsEmailModalOpen(true);
    } else if (reauthAction === "delete") {
      handleDeleteAccount();
    }
  };


  const handleExportData = async () => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('Not authenticated');

      // Fetch addresses and orders in parallel
      const [addressesRes, ordersRes] = await Promise.all([
        supabase.from('addresses').select('*').eq('user_id', user.id),
        supabase.from('orders').select('*, order_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      const addresses = addressesRes.data || [];
      const orders = ordersRes.data || [];

      // ── Client-side PDF generation ────────────────────────────────
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PAGE_W = 210;
      const PAGE_H = 297;
      const MARGIN = 15;
      const RIGHT = PAGE_W - MARGIN;

      function peso(n: number) {
        return `PHP ${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
      }
      function fmtDate(iso: string) {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      function fmtStatus(s: string) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      }

      // ── 1. Cover / Header ─────────────────────────────────────────
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, PAGE_W, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Never Stop Dreaming Trading', MARGIN, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text('Account Data Export', MARGIN, 24);

      doc.setFontSize(8);
      doc.text(`Generated: ${fmtDate(new Date().toISOString())}`, RIGHT, 24, { align: 'right' });

      let y = 50;

      // ── 2. Profile Info ───────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text('Profile Information', MARGIN, y);

      y += 2;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y + 2, RIGHT, y + 2);
      y += 8;

      const profileRows = [
        ['Name', user.name || '—'],
        ['Email', user.email || '—'],
        ['Phone', user.phone || '—'],
        ['Member Since', user.memberSince ? fmtDate(user.memberSince) : '—'],
      ];

      autoTable(doc, {
        startY: y,
        body: profileRows,
        theme: 'plain',
        styles: { fontSize: 9, textColor: [40, 40, 40] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100] },
          1: { cellWidth: 120 },
        },
        margin: { left: MARGIN, right: MARGIN },
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // ── 3. Addresses ──────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text('Saved Addresses', MARGIN, y);
      y += 2;
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, y + 2, RIGHT, y + 2);
      y += 6;

      if (addresses.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(140, 140, 140);
        doc.text('No saved addresses.', MARGIN, y + 6);
        y += 14;
      } else {
        const addrRows = addresses.map((a: any) => [
          a.full_name || '—',
          a.street_address || '—',
          [a.city, a.province].filter(Boolean).join(', ') + (a.zip_code ? ` ${a.zip_code}` : ''),
          a.phone || '—',
          a.is_default ? '✓ Default' : '',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Name', 'Street', 'City / Province', 'Phone', '']],
          body: addrRows,
          theme: 'striped',
          headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
          columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 42 },
            2: { cellWidth: 45 },
            3: { cellWidth: 32 },
            4: { cellWidth: 20, textColor: [16, 120, 80], fontStyle: 'bold' },
          },
          margin: { left: MARGIN, right: MARGIN },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
      }

      // ── 4. Order History ──────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text('Order History', MARGIN, y);
      y += 2;
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, y + 2, RIGHT, y + 2);
      y += 6;

      if (orders.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(140, 140, 140);
        doc.text('No orders found.', MARGIN, y + 6);
      } else {
        // Build order summary rows + nested item rows
        const orderBody: any[] = [];

        orders.forEach((o: any, idx: number) => {
          const orderNum = `#NSD-${String(idx + 1).padStart(5, '0')}`; // fallback sequential
          const items: any[] = Array.isArray(o.order_items) ? o.order_items
            : Array.isArray(o.items) ? o.items : [];

          const itemsText = items
            .map((it: any) => `${it.name || 'Product'} × ${it.quantity || 1}`)
            .join(', ') || '—';

          orderBody.push([
            orderNum,
            fmtDate(o.created_at),
            itemsText,
            peso(Number(o.total) || 0),
            fmtStatus(o.status || 'pending'),
          ]);
        });

        autoTable(doc, {
          startY: y,
          head: [['Order #', 'Date', 'Items', 'Total', 'Status']],
          body: orderBody,
          theme: 'striped',
          headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 8 },
          bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], valign: 'top' },
          columnStyles: {
            0: { cellWidth: 22, fontStyle: 'bold' },
            1: { cellWidth: 24 },
            2: { cellWidth: 80 },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 22 },
          },
          margin: { left: MARGIN, right: MARGIN },
        });
      }

      // ── 5. Footer ──────────────────────────────────────────────────
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, PAGE_H - 18, RIGHT, PAGE_H - 18);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text('This document is confidential and intended only for the account holder.', PAGE_W / 2, PAGE_H - 12, { align: 'center' });
      doc.text('© Never Stop Dreaming Trading', PAGE_W / 2, PAGE_H - 7, { align: 'center' });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`NSD-Account-Data-${date}.pdf`);

      toast({
        title: 'Data Exported',
        description: 'Your account data PDF has been downloaded successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setReauthAction(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/delete', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Failed to delete account");

      toast({ 
        title: "Account Marked for Deletion", 
        description: "Your account will be permanently deleted in 30 days. You have been signed out.", 
        variant: "success" 
      });
      
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error: any) {
       toast({ 
         title: "Error", 
         description: error.message || "Failed to delete account.", 
         variant: "destructive" 
       });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/profile"
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Profile
          </Link>

          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

          {user.deleted_at && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-destructive mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-destructive">Account Marked for Deletion</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is scheduled for permanent deletion. You have until{' '}
                    <span className="font-medium">
                      {new Date(new Date(user.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>{' '}
                    to restore it.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={async () => {
                  const { error } = await restoreAccount();
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Success", description: "Account restored successfully!", variant: "success" });
                  }
                }}
                id="restore-account-btn"
              >
                Restore Account
              </Button>
            </div>
          )}

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
                    onValueChange={(value) => {
                      setPreferences((prev) => ({ ...prev, theme: value }));
                      setTheme(value);
                    }}
                    placeholder="Select theme"
                    searchPlaceholder="Search theme..."
                    triggerClassName="mt-2"
                  />
                </div>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportData}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Exporting...' : 'Export PDF'}
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

                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div>
                    <p className="font-medium">Change Email</p>
                    <p className="text-sm text-muted-foreground">Update your account email address</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setReauthAction("email")}>
                    Change Email
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border-l-2 border-destructive">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setReauthAction("delete")}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Delete"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Link
                href="/profile"
                className="flex-1 flex items-center justify-center px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors text-sm font-medium"
              >
                Cancel
              </Link>
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

      {/* Email Change Modal (Step 2) */}
      <EmailChangeModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={user.email || ""}
      />
    </div>
  );
}

