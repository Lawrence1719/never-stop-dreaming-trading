'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, User, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase/client';
import { clearSettingsCache } from '@/lib/hooks/use-settings';

interface Settings {
  general: {
    storeName: string;
    tagline: string;
    contactEmail: string;
    contactPhone: string;
    businessAddress: string;
  };
  shipping: {
    standardRate: string;
    expressRate: string;
    freeShippingThreshold: string;
  };
  payment: {
    creditCard: boolean;
    cashOnDelivery: boolean;
    bankTransfer: boolean;
  };
  system: {
    maintenanceMode: boolean;
    enableCustomerRegistration: boolean;
    enableProductReviews: boolean;
    enableWishlist: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/admin/settings', {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (!res.ok) {
          throw new Error('Failed to load settings');
        }

        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async (section: 'general' | 'shipping' | 'payment' | 'system') => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (section === 'general') {
        const { validatePhoneNumber } = await import('@/lib/utils/validation');
        if (settings.general.contactPhone && !validatePhoneNumber(settings.general.contactPhone)) {
          throw new Error('Please enter a valid 10-digit Philippine phone number starting with 9 for the contact phone.');
        }
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          section,
          settings: settings[section],
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save settings');
      }

      // Clear the public settings cache so customer pages see the update
      clearSettingsCache();
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (section: keyof Settings, key: string, value: any) => {
    if (!settings) return;
    let newValue = value;
    if (section === 'general' && key === 'contactPhone') {
      newValue = value.replace(/\D/g, '');
    }
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: newValue,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your store settings and preferences</p>
      </div>

      {saved && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      ) : settings ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic store information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="store-name">Store Name</Label>
                <Input
                  id="store-name"
                  value={settings.general.storeName}
                  onChange={(e) => updateSetting('general', 'storeName', e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={settings.general.tagline}
                  onChange={(e) => updateSetting('general', 'tagline', e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.general.contactEmail}
                  onChange={(e) => updateSetting('general', 'contactEmail', e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="phone">Contact Phone</Label>
                <div className="relative mt-2">
                  <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-sm text-muted-foreground pointer-events-none">
                    <span role="img" aria-label="PH flag">🇵🇭</span>
                    <span>+63</span>
                  </div>
                  <Input
                    id="phone"
                    value={settings.general.contactPhone}
                    onChange={(e) => updateSetting('general', 'contactPhone', e.target.value)}
                    maxLength={10}
                    placeholder="9123456789"
                    className="pl-16"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Format: 9XXXXXXXXX (10 digits)</p>
              </div>
              <div>
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={settings.general.businessAddress}
                  onChange={(e) => updateSetting('general', 'businessAddress', e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button onClick={() => handleSave('general')} className="gap-2" disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Settings</CardTitle>
              <CardDescription>Configure shipping rates and zones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="shipping-standard">Standard Shipping Rate</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-muted-foreground">₱</span>
                  <Input
                    id="shipping-standard"
                    type="number"
                    step="0.01"
                    value={settings.shipping.standardRate}
                    onChange={(e) => updateSetting('shipping', 'standardRate', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="shipping-express">Express Shipping Rate</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-muted-foreground">₱</span>
                  <Input
                    id="shipping-express"
                    type="number"
                    step="0.01"
                    value={settings.shipping.expressRate}
                    onChange={(e) => updateSetting('shipping', 'expressRate', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="shipping-free">Free Shipping Threshold</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-muted-foreground">₱</span>
                  <Input
                    id="shipping-free"
                    type="number"
                    step="0.01"
                    value={settings.shipping.freeShippingThreshold}
                    onChange={(e) => updateSetting('shipping', 'freeShippingThreshold', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <Button onClick={() => handleSave('shipping')} className="gap-2" disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Credit/Debit Card</Label>
                <Switch
                  checked={settings.payment.creditCard}
                  onCheckedChange={(checked) => updateSetting('payment', 'creditCard', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Cash on Delivery</Label>
                <Switch
                  checked={settings.payment.cashOnDelivery}
                  onCheckedChange={(checked) => updateSetting('payment', 'cashOnDelivery', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Bank Transfer</Label>
                <Switch
                  checked={settings.payment.bankTransfer}
                  onCheckedChange={(checked) => updateSetting('payment', 'bankTransfer', checked)}
                />
              </div>
              <Button onClick={() => handleSave('payment')} className="gap-2" disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Advanced system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Maintenance Mode</Label>
                <Switch
                  checked={settings.system.maintenanceMode}
                  onCheckedChange={(checked) => updateSetting('system', 'maintenanceMode', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Customer Registration</Label>
                <Switch
                  checked={settings.system.enableCustomerRegistration}
                  onCheckedChange={(checked) => updateSetting('system', 'enableCustomerRegistration', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Product Reviews</Label>
                <Switch
                  checked={settings.system.enableProductReviews}
                  onCheckedChange={(checked) => updateSetting('system', 'enableProductReviews', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Wishlist</Label>
                <Switch
                  checked={settings.system.enableWishlist}
                  onCheckedChange={(checked) => updateSetting('system', 'enableWishlist', checked)}
                />
              </div>
              <Button onClick={() => handleSave('system')} className="gap-2" disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Admin Profile</CardTitle>
              <CardDescription>Manage your admin account settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 border border-border rounded-lg bg-secondary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Manage Your Profile</h3>
                      <p className="text-sm text-muted-foreground">
                        Update your personal information, security settings, and preferences
                      </p>
                    </div>
                  </div>
                  <Button asChild className="gap-2">
                    <Link href="/admin/profile">
                      Go to Profile
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Profile Information</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update your name, email, phone number, and other personal details.
                  </p>
                  <Button variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/admin/profile?tab=profile">
                      Edit Profile
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Security Settings</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Change your password, enable two-factor authentication, and manage security preferences.
                  </p>
                  <Button variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/admin/profile?tab=security">
                      Security Settings
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Preferences</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize your admin experience, notifications, and activity settings.
                  </p>
                  <Button variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/admin/profile?tab=preferences">
                      View Preferences
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      ) : null}
    </div>
  );
}
