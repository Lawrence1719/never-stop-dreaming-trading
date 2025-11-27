'use client';

import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockCoupons = [
  { id: 1, code: 'SUMMER20', type: 'Percentage', discount: '20%', minPurchase: '₱50', usage: '234/500', expires: '2024-08-31', status: 'active' },
  { id: 2, code: 'SAVE10', type: 'Fixed Amount', discount: '₱10', minPurchase: '₱30', usage: '189/1000', expires: '2024-12-31', status: 'active' },
  { id: 3, code: 'FREESHIP', type: 'Free Shipping', discount: 'Free', minPurchase: '₱25', usage: '456/999', expires: '2024-07-31', status: 'expired' },
  { id: 4, code: 'WELCOME15', type: 'Percentage', discount: '15%', minPurchase: 'None', usage: '0/Unlimited', expires: 'Never', status: 'active' },
];

export default function CouponsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount coupons</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>Active and inactive discount codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min. Purchase</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                    <TableCell className="text-sm">{coupon.type}</TableCell>
                    <TableCell className="font-medium">{coupon.discount}</TableCell>
                    <TableCell className="text-sm">{coupon.minPurchase}</TableCell>
                    <TableCell className="text-sm">{coupon.usage}</TableCell>
                    <TableCell className="text-sm">{coupon.expires}</TableCell>
                    <TableCell>
                      <Badge variant={coupon.status === 'active' ? 'default' : 'destructive'}>
                        {coupon.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
