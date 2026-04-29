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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    // from the URL and fires PASSWORD_RECOVERY via onAuthStateChange.
    // We also listen for SIGNED_IN which Supabase emits when the recovery
    // session is established (varies by Supabase JS version).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus('ready');
      }
    });

    // Safety: if the event never fires (bad/expired link), show an error.
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
      // supabase.auth.updateUser() uses the active PASSWORD_RECOVERY session —
      // no token reads, no listUsers(), no user_metadata writes.
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) throw updateError;

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
        router.push('/admin/login');
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setError(message);
      setStatus('ready');
    }
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (status === 'waiting') {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl">Verifying Link…</CardTitle>
          <CardDescription>Please wait while we verify your reset link.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === 'invalid') {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Invalid or Expired Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Please request a new one from
            your profile settings.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pb-8">
          <Button onClick={() => router.push('/admin/profile')} className="w-full">
            Back to Profile
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Password Updated</CardTitle>
          <CardDescription>
            Your password has been changed. Redirecting to login…
          </CardDescription>
        </CardHeader>
        <CardFooter className="pb-8">
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/admin/login');
            }}
            className="w-full"
          >
            Go to Login Now
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // status === 'ready' | 'saving'
  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader>
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
        <CardDescription className="text-center">
          Enter a new password for your admin account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={status === 'saving'}
              placeholder="Minimum 8 characters"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Requirements: 8+ chars, Uppercase, Lowercase, Number, Symbol
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={status === 'saving'}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11"
            disabled={status === 'saving' || !newPassword || !confirmPassword}
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading…</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
