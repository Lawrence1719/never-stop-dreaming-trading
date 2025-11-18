'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockInventory = [
  { id: 1, product: 'Wireless Headphones', sku: 'WH-001', current: 45, reserved: 5, available: 40, status: 'in_stock', lastUpdate: '2 hours ago' },
  { id: 2, product: 'USB-C Cable', sku: 'USB-002', current: 5, reserved: 2, available: 3, status: 'low_stock', lastUpdate: '1 hour ago' },
  { id: 3, product: 'Phone Stand', sku: 'PS-003', current: 0, reserved: 0, available: 0, status: 'out_stock', lastUpdate: '4 hours ago' },
  { id: 4, product: 'Laptop Bag', sku: 'LB-004', current: 120, reserved: 15, available: 105, status: 'in_stock', lastUpdate: '30 min ago' },
];

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInventory = mockInventory.filter(
    (item) =>
      (searchTerm === '' ||
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || item.status === statusFilter)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'default';
      case 'low_stock':
        return 'secondary';
      case 'out_stock':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage product stock levels</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adjust Stock
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
          <CardDescription>Current inventory status across all products</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product or SKU..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.sku}</TableCell>
                    <TableCell>{item.current}</TableCell>
                    <TableCell>{item.reserved}</TableCell>
                    <TableCell className="font-medium">{item.available}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(item.status)}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.lastUpdate}</TableCell>
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
