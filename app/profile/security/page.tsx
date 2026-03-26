"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Shield, Lock, Smartphone, Key, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function SecurityPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, requestCustomerPasswordReset } = useAuth();
  const { toast } = useToast();

  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
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

  const handleRequestPasswordReset = async () => {
    setIsSendingLink(true);
    try {
      const { error } = await requestCustomerPasswordReset();
      if (error) throw error;
      
      setIsLinkSent(true);
      toast({
        title: "Link Sent",
        description: `A verification link has been sent to ${user?.email}.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleToggle2FA = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTwoFactorEnabled(!twoFactorEnabled);
      toast({
        title: "Success",
        description: twoFactorEnabled ? "2FA disabled" : "2FA enabled",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update 2FA settings. Please try again.",
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="text-3xl font-bold mb-8">Security Settings</h1>

          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Change Password</h2>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To change your password, we'll send a secure verification link to your registered email address. This ensures that only you can authorize this change.
                </p>
                {isLinkSent ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Reset link sent! Check <span className="font-semibold">{user.email}</span>
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={handleRequestPasswordReset} 
                    disabled={isSendingLink}
                    className="w-full sm:w-auto font-semibold"
                  >
                    {isSendingLink ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {twoFactorEnabled && (
                    <Badge variant="default">Active</Badge>
                  )}
                  <Button
                    variant={twoFactorEnabled ? "destructive" : "default"}
                    onClick={handleToggle2FA}
                    disabled={isLoading}
                  >
                    {twoFactorEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
              {twoFactorEnabled && (
                <div className="mt-4 p-4 bg-secondary/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Authenticator App</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use an authenticator app like Google Authenticator or Authy to generate codes.
                  </p>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Key className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Active Sessions</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-muted-foreground">
                      Windows • Chrome • New York, NY
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last active: Just now
                    </p>
                  </div>
                  <Badge variant="default">Current</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div>
                    <p className="font-medium">Mobile Device</p>
                    <p className="text-sm text-muted-foreground">
                      iOS • Safari • New York, NY
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last active: 2 hours ago
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Revoke All Other Sessions
              </Button>
            </div>

            {/* Security Recommendations */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Security Recommendations</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="font-medium text-sm">Strong Password</p>
                    <p className="text-xs text-muted-foreground">
                      Your password meets security requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                  <div>
                    <p className="font-medium text-sm">Enable Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

