'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Label } from '@/components/ui/label';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, logout, isLoading: authLoading } = useAuth();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing reset link. Please request a new one from your profile settings.');
    }
  }, [token, email]);

  const handleSessionConflictLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setIsSuccess(true);
      toast({
        title: "Success",
        description: "Password reset successfully! You will be redirected to login.",
        variant: "success",
      });

      // Clear the invalid session and redirect to login
      setTimeout(async () => {
        await logout();
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Reset failed:', error);
      setError(error.message || 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md w-full mx-auto bg-card border border-border rounded-xl p-8 shadow-sm text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Password Reset Successful</h2>
          <p className="text-muted-foreground">
            Your password has been updated. You will be redirected to the login page in a few seconds.
          </p>
        </div>
        <Button onClick={async () => {
          await logout();
          router.push('/login');
        }} className="w-full py-6">
          Login Now
        </Button>
      </div>
    );
  }

  // Session conflict check
  if (user && user.email !== email) {
    return (
      <div className="max-w-md w-full mx-auto bg-card border border-border rounded-xl p-8 shadow-sm text-center space-y-6">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Session Conflict</h2>
          <p className="text-muted-foreground">
            You are currently logged in as <span className="font-semibold text-foreground">{user.email}</span>. 
            To reset the password for <span className="font-semibold text-foreground">{email}</span>, you must sign out first.
          </p>
        </div>
        <Button 
          onClick={handleSessionConflictLogout} 
          disabled={isLoggingOut}
          className="w-full py-6 font-bold"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            'Sign Out & Continue'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
        <p className="text-muted-foreground">Enter a new secure password for {email}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password font-semibold">New Password</Label>
            <div className="relative">
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                disabled={!!error && !token}
                className={`py-6 pl-10 ${error.includes('characters') ? 'border-destructive' : ''}`}
              />
              <Lock className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password font-semibold">Confirm Password</Label>
            <div className="relative">
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                disabled={!!error && !token}
                className={`py-6 pl-10 ${error.includes('match') ? 'border-destructive' : ''}`}
              />
              <Lock className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-destructive">
                {error}
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full py-7 text-lg font-bold shadow-lg shadow-primary/20" 
            disabled={isSaving || !newPassword || !confirmPassword || (!!error && !token)}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>

      <p className="text-center mt-6 text-sm text-muted-foreground">
        Remember your password? <Button variant="link" onClick={() => router.push('/login')} className="p-0 h-auto font-semibold">Login here</Button>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 py-20">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading security page...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
