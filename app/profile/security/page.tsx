"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Shield, 
  Lock, 
  Smartphone, 
  Key, 
  CheckCircle2, 
  Loader2,
  Monitor,
  Tablet,
  Globe,
  AlertCircle,
  History,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";
import { UAParser } from 'ua-parser-js';
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SessionRow = {
  id: string;
  user_agent: string;
  updated_at: string;
  ip_address: string;
  is_current: boolean;
};

type SessionHistoryRow = {
  id: string;
  session_id: string;
  user_agent: string;
  ip_address: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  is_active_session: boolean;
};

export default function SecurityPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, requestCustomerPasswordReset } = useAuth();
  const { toast } = useToast();

  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Session states
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryRow[]>([]);
  const [isFetchingSessions, setIsFetchingSessions] = useState(true);
  const [sessionFetchError, setSessionFetchError] = useState<{ message: string; setupRequired?: boolean } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  
  // Dialog states
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    
    if (user) {
      fetchSessions();
    }
  }, [user, authLoading, router]);

  const fetchSessions = async () => {
    try {
      setIsFetchingSessions(true);
      setSessionFetchError(null);
      const response = await fetch('/api/profile/sessions', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        setSessionFetchError({
          message: data.error || 'Failed to load sessions',
          setupRequired: data.setupRequired,
        });
        return;
      }

      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setSessionHistory(Array.isArray(data.sessionHistory) ? data.sessionHistory : []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setSessionFetchError({ message: 'A network error occurred while loading sessions.' });
    } finally {
      setIsFetchingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const response = await fetch(`/api/profile/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchSessions();
        toast({
          title: "Session Revoked",
          description: "The device has been successfully logged out.",
          variant: "success",
        });
      } else {
        throw new Error('Failed to revoke session');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
      setConfirmRevokeId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      setIsRevokingAll(true);
      const response = await fetch('/api/profile/sessions?scope=all', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "All Sessions Revoked",
          description: "You have been logged out from all devices.",
          variant: "success",
        });
        // End current session locally as per prompt requirement "end ALL including current"
        await supabase.auth.signOut();
        router.push('/login');
      } else {
        throw new Error('Failed to revoke sessions');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke sessions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRevokingAll(false);
      setShowRevokeAllDialog(false);
    }
  };

  const parseUA = (ua: string) => {
    const parser = new UAParser(ua);
    const result = parser.getResult();
    return {
      browser: result.browser.name || 'Unknown Browser',
      os: result.os.name || 'Unknown OS',
      device: result.device.type || 'desktop'
    };
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

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
      // Mock 2FA toggle
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newState = !twoFactorEnabled;
      setTwoFactorEnabled(newState);
      toast({
        title: "Success",
        description: newState ? "2FA enabled" : "2FA disabled",
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

  if (!user) return null;

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
                {isFetchingSessions ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : sessionFetchError ? (
                  <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 py-6">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div className="ml-2">
                      <AlertTitle className="font-bold text-base mb-1">Notice: Account Dashboard Incomplete</AlertTitle>
                      <AlertDescription className="text-sm opacity-90">
                        {sessionFetchError.setupRequired ? (
                          <div className="space-y-4">
                            <p>
                              To protect your privacy and enable multi-device session management, you need to run a small SQL one-time setup on your database dashboard.
                            </p>
                            <div className="bg-background/80 p-4 rounded-md border border-destructive/20 text-foreground">
                              <p className="font-bold mb-1 uppercase text-xs tracking-wider opacity-60">How to fix this:</p>
                              <p>Open your <strong>Supabase SQL Editor</strong> and paste the script provided in the <strong>walkthrough.md</strong> file.</p>
                            </div>
                          </div>
                        ) : (
                          <p>{sessionFetchError.message}</p>
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active sessions found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => {
                      const { browser, os, device } = parseUA(session.user_agent);
                      
                      return (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-background rounded-full border border-border">
                              {getDeviceIcon(device)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">
                                  {os} • {browser}
                                </p>
                                {session.is_current && (
                                  <Badge variant="default" className="text-[10px] h-4 font-black uppercase tracking-tighter bg-primary text-primary-foreground">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <Globe className="w-3 h-3" />
                                {session.ip_address || 'Unknown Location'}
                              </p>
                              <p className="text-[10px] font-medium text-muted-foreground/60 mt-1 uppercase tracking-widest">
                                Last active: {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {!session.is_current && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="font-bold text-xs h-8 px-4"
                              onClick={() => setConfirmRevokeId(session.id)}
                              disabled={revokingId === session.id}
                            >
                              {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-6 font-black uppercase text-xs tracking-widest h-11 border-dashed border-2 hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all"
                onClick={() => setShowRevokeAllDialog(true)}
                disabled={isRevokingAll || sessions.length <= 1}
              >
                {isRevokingAll ? 'Revoking all...' : 'Revoke All Sessions'}
              </Button>
            </div>

            {/* Sign-in history (where you signed in; includes ended sessions) */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Sign-in history</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Recent sign-ins and devices we have recorded. Open this page on each device once so IP and browser details stay up to date.
              </p>
              {isFetchingSessions ? (
                <div className="flex flex-col gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : sessionFetchError ? null : sessionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No sign-in history yet. History is recorded when you load this page or use the site while signed in.
                </p>
              ) : (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {sessionHistory.map((row) => {
                    const { browser, os, device } = parseUA(row.user_agent);
                    return (
                      <div
                        key={row.id}
                        className="flex items-start justify-between gap-3 p-4 bg-secondary/10 rounded-lg border border-border/60"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 p-2 bg-background rounded-full border border-border shrink-0">
                            {getDeviceIcon(device)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-sm truncate">
                                {os} • {browser}
                              </p>
                              {row.is_active_session ? (
                                <Badge variant="default" className="text-[10px] h-4 shrink-0">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] h-4 shrink-0">
                                  Ended
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <Globe className="w-3 h-3 shrink-0" />
                              {row.ip_address || "Unknown"}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground/70 mt-1 uppercase tracking-widest">
                              Signed in {formatDistanceToNow(new Date(row.started_at), { addSuffix: true })}
                              {row.ended_at
                                ? ` · Ended ${formatDistanceToNow(new Date(row.ended_at), { addSuffix: true })}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                      Ensure your password has 8+ characters, including uppercase, lowercase, numbers, and symbols.
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
      
      {/* Confirmation Dialogs */}
      <AlertDialog open={!!confirmRevokeId} onOpenChange={(open) => !open && setConfirmRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This device will be logged out immediately. You will need to sign in again from that device to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmRevokeId && handleRevokeSession(confirmRevokeId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log out all active sessions including your current one. You will be redirected to the login page. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeAllOthers}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
