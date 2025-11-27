'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';

interface CustomerGroup {
  id: string;
  name: string;
  description: string;
  customers: number;
  discount: string;
  status: string;
}

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      setIsLoading(true);
      setError(null);
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch('/api/admin/customer-groups', {
          method: 'GET',
          credentials: 'include',
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load customer groups');
        }

        const payload = await res.json();
        setGroups(payload.data || []);
      } catch (err) {
        console.error('Failed to load customer groups', err);
        setError(err instanceof Error ? err.message : 'Failed to load customer groups');
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroups();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Groups</h1>
          <p className="text-muted-foreground mt-1">Segment and manage customer groups</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={`loading-${idx}`} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded w-20 mb-2" />
                <div className="h-4 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))
        ) : groups.length === 0 ? (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            No customer groups found.
          </div>
        ) : (
          groups.map((group) => (
            <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{group.description}</CardDescription>
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customers:</span>
                <span className="font-medium">{group.customers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-green-600">{group.discount}</span>
              </div>
              <div className="flex justify-between text-sm items-center pt-2 border-t">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={group.status === 'active' ? 'default' : 'outline'}>
                  {group.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
}
