'use client';

import { useState } from 'react';
import { Search, Download, MoreVertical } from 'lucide-react';
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

const mockCustomers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 234 567 8900',
    orders: 5,
    totalSpent: '$456.50',
    status: 'active',
    joinDate: '2023-06-15',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1 234 567 8901',
    orders: 12,
    totalSpent: '$1,234.99',
    status: 'active',
    joinDate: '2023-03-20',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '+1 234 567 8902',
    orders: 2,
    totalSpent: '$245.00',
    status: 'blocked',
    joinDate: '2024-01-01',
  },
  {
    id: 4,
    name: 'Alice Williams',
    email: 'alice@example.com',
    phone: '+1 234 567 8903',
    orders: 8,
    totalSpent: '$892.50',
    status: 'active',
    joinDate: '2023-09-10',
  },
];

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCustomers = mockCustomers.filter(
    (customer) =>
      (searchTerm === '' ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || customer.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-1">Manage and view all your customers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>All registered customers in your store</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-sm">{customer.email}</TableCell>
                    <TableCell className="text-sm">{customer.phone}</TableCell>
                    <TableCell>{customer.orders}</TableCell>
                    <TableCell className="font-medium">{customer.totalSpent}</TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.joinDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {filteredCustomers.length} of {mockCustomers.length} customers
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
