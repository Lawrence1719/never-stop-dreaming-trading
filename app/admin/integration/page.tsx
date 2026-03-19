'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Key, AlertCircle, CheckCircle } from 'lucide-react';

export default function IntegrationPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGetToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setToken(null);

    try {
      const res = await fetch('/api/integration/user/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.data?.message || data?.message || 'Failed to get token');
        return;
      }

      if (data.success && data.data?.token) {
        setToken(data.data.token);
      } else {
        setError('No token in response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get token');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ERP Integration (e‑commerce)</h1>
        <p className="text-muted-foreground">
          Get a token for BeatRoute / external systems. Use the token where indicated below. This is the live e‑commerce integration (not sandbox).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Get Token
          </CardTitle>
          <CardDescription>
            Enter the integration username and password (configured in environment variables).
            Click Get Token to receive a token for the external system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleGetToken} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Integration username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Integration password"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Getting token...' : 'Get Token'}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {token && (
            <div className="space-y-3 rounded-lg border-2 border-green-500/50 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-950/30">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Token received</span>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">
                  Where to put this token (e‑commerce / BeatRoute):
                </Label>
                <p className="text-sm text-muted-foreground">
                  Paste this value into the <strong>Token</strong> or <strong>Bearer Token</strong> field on the BeatRoute / SMC connection screen, or use it in API requests as <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;this token&gt;</code>.
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={token}
                    className="font-mono text-sm"
                    aria-label="Token to put in BeatRoute or API Authorization header"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={copyToken} title="Copy token">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-muted-foreground">Copied to clipboard.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where to put the token (e‑commerce integration)</CardTitle>
          <CardDescription>
            Use the token from above in the external system (BeatRoute / SMC) as follows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 space-y-2 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Put the token here</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>BeatRoute / SMC:</strong> In the connection screen, use the <strong>Token</strong> or <strong>Bearer Token</strong> field — paste the token you got from &quot;Get Token&quot; above.</li>
              <li>If the system supports auto-refresh, set <strong>REFRESH URL</strong> to: <code className="bg-muted px-1 rounded">{baseUrl}/api/integration/user/refresh</code> and <strong>USERNAME</strong> / <strong>PASSWORD</strong>; then the token is obtained automatically.</li>
            </ul>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="font-medium">1. BeatRoute / SMC connection screen</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Set <strong>REFRESH URL</strong> to: <code className="bg-muted px-1 rounded">{baseUrl}/api/integration/user/refresh</code></li>
              <li>Set <strong>USERNAME</strong> and <strong>PASSWORD</strong> to the integration credentials.</li>
              <li>Click <strong>Get Token</strong> / <strong>REFRESH TOKEN</strong> — the system will call our URL and receive the token.</li>
              <li>The token is then used automatically when pushing orders.</li>
            </ul>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="font-medium">2. When calling Orders API directly</p>
            <p className="text-sm text-muted-foreground">
              Put the token in the request header:
            </p>
            <div className="flex gap-2 items-center">
              <code className="block text-sm bg-muted p-2 rounded break-all flex-1">
                Authorization: Bearer {token || <span className="text-muted-foreground">&lt;get token above first&gt;</span>}
              </code>
              {token && (
                <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`Authorization: Bearer ${token}`); }} title="Copy auth header">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Orders endpoint: <code className="bg-muted px-1 rounded">{baseUrl}/api/integration/orders</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
