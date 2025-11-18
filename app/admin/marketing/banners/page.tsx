'use client';

import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockBanners = [
  { id: 1, title: 'Summer Sale', location: 'Homepage Hero', status: 'active', clicks: 1234, impressions: 5600 },
  { id: 2, title: 'New Arrivals', location: 'Product Page', status: 'active', clicks: 892, impressions: 3200 },
  { id: 3, title: 'Flash Deal', location: 'Sidebar', status: 'scheduled', clicks: 0, impressions: 0 },
  { id: 4, title: 'Winter Collection', location: 'Header', status: 'inactive', clicks: 456, impressions: 2100 },
];

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banners</h1>
          <p className="text-muted-foreground mt-1">Manage promotional banners</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Banner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockBanners.map((banner) => (
          <Card key={banner.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{banner.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">{banner.location}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted h-32 rounded flex items-center justify-center text-muted-foreground">
                Banner Image Preview
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Clicks</p>
                  <p className="font-medium">{banner.clicks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Impressions</p>
                  <p className="font-medium">{banner.impressions}</p>
                </div>
              </div>
              <Badge variant={banner.status === 'active' ? 'default' : 'outline'}>
                {banner.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
