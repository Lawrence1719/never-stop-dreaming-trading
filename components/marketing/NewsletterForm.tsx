'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewsletterFormProps {
  variant?: 'default' | 'minimal';
}

export function NewsletterForm({ variant = 'default' }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to subscribe');
      }

      const data = await res.json();

      setStatus('success');
      setMessage(data.message || 'Successfully subscribed!');
      setEmail('');
      setFullName('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-primary animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="h-10 w-10 mb-2" />
        <p className="font-semibold text-lg">{message}</p>
        <button 
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm underline hover:no-underline text-muted-foreground"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'submitting'}
          className="w-full sm:flex-1 px-4 py-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          aria-label="Email address for newsletter"
        />
        <button
          type="submit"
          disabled={status === 'submitting' || !email}
          className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          aria-label={status === 'submitting' ? "Subscribing..." : "Subscribe"}
        >
          {status === 'submitting' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Subscribe'
          )}
        </button>
      </div>

      {status === 'error' && (
        <div className="flex items-center justify-center gap-2 text-destructive text-sm animate-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4" />
          <p>{message}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        By subscribing, you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
}
