'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Download, MoreVertical, Edit, Trash2, Ban, UserCheck, Eye, Shield } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: string | number;
  status: string;
  joinDate: string;
  role: string;
  isSuperAdmin?: boolean;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    
    async function fetchCustomers() {
      setIsLoading(true);
      setError(null);
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);

        const res = await fetch(`/api/admin/customers?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load customers');
        }

        const payload = await res.json();
        setCustomers(payload.data || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to load customers', err);
        setError(err instanceof Error ? err.message : 'Failed to load customers');
        setCustomers([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchCustomers();

    return () => controller.abort();
  }, [debouncedSearchTerm, statusFilter, refreshKey]);

  const refreshCustomers = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleBlockCustomer = async (customerId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/customers/${customerId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to block customer');
      }

      toast({
        title: 'Customer blocked',
        description: 'Customer has been blocked successfully.',
      });
      refreshCustomers();
    } catch (err) {
      console.error('Failed to block customer', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to block customer',
        variant: 'destructive',
      });
    }
  };

  const handleUnblockCustomer = async (customerId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/customers/${customerId}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unblock customer');
      }

      toast({
        title: 'Customer unblocked',
        description: 'Customer has been unblocked successfully.',
      });
      refreshCustomers();
    } catch (err) {
      console.error('Failed to unblock customer', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to unblock customer',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete customer');
      }

      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
      toast({
        title: 'Customer deleted',
        description: 'Customer has been deleted successfully.',
      });
      refreshCustomers();
    } catch (err) {
      console.error('Failed to delete customer', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete customer',
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (customerId: string, newRole: 'admin' | 'customer') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/customers/${customerId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to change role');
      }

      toast({
        title: 'Role updated',
        description: `Customer role changed to ${newRole} successfully.`,
      });
      refreshCustomers();
    } catch (err) {
      console.error('Failed to change role', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to change role',
        variant: 'destructive',
      });
    }
  };

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

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

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
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-8" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-sm">{customer.email}</TableCell>
                      <TableCell className="text-sm">{customer.phone}</TableCell>
                      <TableCell>{customer.orders}</TableCell>
                      <TableCell className="font-medium">
                        {typeof customer.totalSpent === 'number' 
                          ? `₱${customer.totalSpent.toFixed(2)}` 
                          : customer.totalSpent}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.isSuperAdmin ? (
                          <Badge className="bg-purple-600 text-white border-0 font-semibold">
                            ⭐ Super Admin
                          </Badge>
                        ) : (
                          <Badge variant={customer.role === 'admin' ? 'secondary' : 'outline'}>
                            {customer.role === 'admin' ? 'Admin' : 'Customer'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.joinDate}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setViewDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {/* Only super admin can edit/modify other super admins */}
                            {!(customer.isSuperAdmin && !currentUserIsSuperAdmin) && (
                              <>
                                <DropdownMenuItem 
                                  className="gap-2"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Customer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {customer.status === 'active' ? (
                                  <DropdownMenuItem 
                                    className="gap-2 text-destructive"
                                    onClick={() => handleBlockCustomer(customer.id)}
                                  >
                                    <Ban className="h-4 w-4" />
                                    Block Customer
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    className="gap-2"
                                    onClick={() => handleUnblockCustomer(customer.id)}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Unblock Customer
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {!customer.isSuperAdmin && (
                                  customer.role !== 'admin' ? (
                                    <DropdownMenuItem 
                                      className="gap-2"
                                      onClick={() => handleChangeRole(customer.id, 'admin')}
                                    >
                                      <Shield className="h-4 w-4" />
                                      Make Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      className="gap-2"
                                      onClick={() => handleChangeRole(customer.id, 'customer')}
                                    >
                                      <Shield className="h-4 w-4" />
                                      Remove Admin
                                    </DropdownMenuItem>
                                  )
                                )}
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Customer
                                </DropdownMenuItem>
                              </>
                            )}
                            {customer.isSuperAdmin && !currentUserIsSuperAdmin && (
                              <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
                                <Shield className="h-4 w-4" />
                                Protected Account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCustomer?.name}'s account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <AlertDialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Customer Details</AlertDialogTitle>
          </AlertDialogHeader>
          {selectedCustomer && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-base">{selectedCustomer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{selectedCustomer.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-base">{selectedCustomer.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <Badge variant={selectedCustomer.role === 'admin' ? 'secondary' : 'outline'}>
                  {selectedCustomer.role === 'admin' ? 'Admin' : 'Customer'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={selectedCustomer.status === 'active' ? 'default' : 'destructive'}>
                  {selectedCustomer.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-base">{selectedCustomer.orders}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-base">
                  {typeof selectedCustomer.totalSpent === 'number' 
                    ? `₱${selectedCustomer.totalSpent.toFixed(2)}` 
                    : selectedCustomer.totalSpent}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                <p className="text-base">{selectedCustomer.joinDate}</p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Customer Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Update customer information. Email cannot be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input 
                  defaultValue={selectedCustomer.name}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input 
                  defaultValue={selectedCustomer.phone}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email (read-only)</label>
                <Input 
                  value={selectedCustomer.email}
                  disabled
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              toast({
                title: 'Coming soon',
                description: 'Edit functionality will be implemented soon.',
              });
              setEditDialogOpen(false);
            }}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
