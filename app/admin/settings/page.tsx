'use client';

import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
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
                <Input id="store-name" defaultValue="Never Stop Dreaming Trading" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" defaultValue="Your trusted online store" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" defaultValue="contact@example.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" defaultValue="+1 234 567 8900" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="address">Business Address</Label>
                <Textarea id="address" defaultValue="123 Main Street, City, State 12345" className="mt-2" />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
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
                <Input id="shipping-standard" defaultValue="$5.00" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="shipping-express">Express Shipping Rate</Label>
                <Input id="shipping-express" defaultValue="$15.00" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="shipping-free">Free Shipping Threshold</Label>
                <Input id="shipping-free" defaultValue="$50.00" className="mt-2" />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
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
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Cash on Delivery</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Bank Transfer</Label>
                <Switch />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
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
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Customer Registration</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Product Reviews</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Wishlist</Label>
                <Switch defaultChecked />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
