'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePasswordStrength } from '@/lib/utils/validation';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

// How long (ms) to wait for the PASSWORD_RECOVERY event before giving up.
const RECOVERY_TIMEOUT_MS = 10_000;

function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState<'waiting' | 'ready' | 'saving' | 'success' | 'invalid'>(
    'waiting'
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase parses the magic-link fragment (#access_token=...&type=recovery)
    // and fires PASSWORD_RECOVERY via onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus('ready');
      }
    });

    // If the event never fires (bad/expired link), show error.
    const timeout = setTimeout(() => {
      setStatus((current) => {
        if (current === 'waiting') return 'invalid';
        return current;
      });
    }, RECOVERY_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordVal = validatePasswordStrength(newPassword);
    if (!passwordVal.valid) {
      setError(passwordVal.error || "Invalid password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setStatus('saving');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.status === 429) {
        throw new Error('Too many attempts. Please try again later.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      // Force sign out immediately to prevent automatic login
      await supabase.auth.signOut();

      setStatus('success');
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
        variant: 'success',
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setError(message);
      setStatus('ready');
    }
  };

  // ── Waiting for Supabase recovery event ──────────────────────────────────
  if (status === 'waiting') {
    return (
      <div className="max-w-md w-full mx-auto bg-card border border-border rounded-xl p-8 shadow-sm text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Verifying Link…</h2>
          <p className="text-muted-foreground">
            Please wait while we verify your reset link.
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ────────────────────────────────────────────────
  if (status === 'invalid') {
    return (
      <div className="max-w-md w-full mx-auto bg-card border border-border rounded-xl p-8 shadow-sm text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Invalid or Expired Link</h2>
          <p className="text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one
            from your profile settings.
          </p>
        </div>
        <Button onClick={() => router.push('/profile/security')} className="w-full py-6">
          Back to Security Settings
        </Button>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === 'success') {
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
        <Button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className="w-full py-6"
        >
          Login Now
        </Button>
      </div>
    );
  }

  // ── Form (status === 'ready' | 'saving') ──────────────────────────────────
  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
        <p className="text-muted-foreground">Enter a new secure password for your account.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="font-semibold">New Password</Label>
            <div className="relative">
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Minimum 8 characters"
                disabled={status === 'saving'}
                className={`py-6 pl-10 ${error.includes('characters') || error.includes('contain') ? 'border-destructive' : ''}`}
              />
              <Lock className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Requirements: 8+ chars, Uppercase, Lowercase, Number, Symbol
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="font-semibold">Confirm Password</Label>
            <div className="relative">
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                disabled={status === 'saving'}
                className={`py-6 pl-10 ${error.includes('match') ? 'border-destructive' : ''}`}
              />
              <Lock className="absolute left-3 top-4 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-7 text-lg font-bold shadow-lg shadow-primary/20"
            disabled={status === 'saving' || !newPassword || !confirmPassword}
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating…
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>

      <p className="text-center mt-6 text-sm text-muted-foreground">
        Remember your password?{' '}
        <Button
          variant="link"
          onClick={() => router.push('/login')}
          className="p-0 h-auto font-semibold"
        >
          Login here
        </Button>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 py-20">
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Loading security page…</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
