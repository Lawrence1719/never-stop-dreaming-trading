'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<{ id: string; name: string; role: string } | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function validateInvite() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Check if we have a session (Supabase handles hash fragments automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error('Failed to retrieve session. Your invitation link may be invalid or expired.');
        }

        // 2. If no session, the link might have expired or is invalid
        if (!session) {
          // If there's an error in the URL query params (e.g. error_description)
          const urlError = searchParams.get('error_description') || searchParams.get('error');
          if (urlError) {
            throw new Error(urlError);
          }
          throw new Error('Invitation link has expired or is invalid. Please contact your administrator.');
        }

        setEmail(session.user.email || '');

        // 3. Fetch the profile to check invitation status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, role, invitation_status')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profileData) {
          console.error('Profile fetch error:', profileError);
          throw new Error('Could not find your staff profile. Please contact support.');
        }

        // 4. If already accepted, redirect to login or dashboard
        if (profileData.invitation_status === 'accepted') {
          toast({
            title: 'Already Activated',
            description: 'Your account is already active. Redirecting you to login...',
          });
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error('Invite validation error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    }

    validateInvite();
  }, [router, searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password.length < 8) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // 2. Update profile status
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          invitation_status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (profileUpdateError) {
        console.error('Failed to update profile status:', profileUpdateError);
      }

      setSuccess(true);
      toast({
        title: 'Account Activated',
        description: 'Welcome to the team! Your account is now active.',
        variant: 'success',
      });

      const redirectPath = profile?.role === 'courier' ? '/courier/dashboard' : '/admin/dashboard';
      setTimeout(() => router.push(redirectPath), 2000);
    } catch (err) {
      console.error('Account activation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
          <p className="text-slate-400">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-md border-rose-500/20 bg-slate-900 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
              <AlertCircle className="h-6 w-6 text-rose-500" />
            </div>
            <CardTitle className="text-white">Invitation Error</CardTitle>
            <CardDescription className="text-slate-400">
              Something went wrong with your invitation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="border-rose-500/50 bg-rose-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full border-slate-700 text-slate-300" 
              variant="outline"
              onClick={() => router.push('/login')}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-md border-emerald-500/20 bg-slate-900 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <CardTitle className="text-white">Success!</CardTitle>
            <CardDescription className="text-slate-400">
              Your account has been activated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-slate-300 pb-8">
            <p>You are being redirected to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl text-white">Join the Team</CardTitle>
          <CardDescription className="text-slate-400">
            Hello {profile?.name}, please set your password to complete your onboarding as a 
            <span className="font-semibold text-sky-400"> {profile?.role}</span>.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 font-medium">Email Address</Label>
              <Input 
                id="email" 
                value={email} 
                disabled 
                className="bg-slate-800/50 border-slate-700 text-slate-400 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="At least 8 characters" className="text-slate-200 font-medium">New Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-800 border-slate-700 text-white focus:ring-sky-500/20"
              />
              <p className="text-xs text-slate-500 flex items-center gap-1.5 px-0.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Minimum 8 characters required.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-200 font-medium">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-800 border-slate-700 text-white focus:ring-sky-500/20"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-lg shadow-sky-900/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating Account...
                </>
              ) : (
                'Activate My Account'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
          <p className="text-slate-400">Loading activation...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
