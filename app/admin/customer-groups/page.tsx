'use client';

import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockGroups = [
  { id: 1, name: 'VIP', description: 'High-value customers', customers: 45, discount: '15%', status: 'active' },
  { id: 2, name: 'Regular', description: 'Active customers', customers: 234, discount: '5%', status: 'active' },
  { id: 3, name: 'New', description: 'Recently joined', customers: 89, discount: '10%', status: 'active' },
  { id: 4, name: 'Inactive', description: 'No orders in 90 days', customers: 156, discount: '0%', status: 'inactive' },
];

export default function CustomerGroupsPage() {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockGroups.map((group) => (
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
        ))}
      </div>
    </div>
  );
}
