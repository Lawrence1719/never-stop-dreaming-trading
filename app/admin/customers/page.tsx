'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, ChevronLeft, ChevronRight, Check, Mail, Phone, Circle, Calendar } from 'lucide-react';
import { CustomerRowActions } from '@/components/admin/customers/CustomerRowActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ModalTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { formatPrice } from '@/lib/utils/formatting';

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

type CustomerRole = 'customer' | 'courier';

export default function CustomersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<CustomerRole | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
  });
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [addCustomerSuccess, setAddCustomerSuccess] = useState(false);
  const [createdCustomerInfo, setCreatedCustomerInfo] = useState<{ name: string; email: string } | null>(null);

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
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, roleFilter]);

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
        if (roleFilter !== 'all') params.append('role', roleFilter);
        params.append('page', currentPage.toString());
        params.append('limit', '10');

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
        const filteredCustomers = payload.data || [];

        setCustomers(filteredCustomers);
        setCurrentUserIsSuperAdmin(payload.currentUser?.isSuperAdmin || false);
        setCurrentUserId(payload.currentUser?.id || null);
        // Calculate total pages based on payload totalCount
        const itemsPerPage = 10;
        const total = payload.totalCount || filteredCustomers.length;
        setTotalCustomers(total);
        setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
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
  }, [debouncedSearchTerm, statusFilter, roleFilter, refreshKey, currentPage]);

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

      setBlockDialogOpen(false);
      setSelectedCustomer(null);
      toast({
        title: 'Customer deactivated',
        description: 'Customer has been deactivated successfully.',
        variant: 'success',
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

      setUnblockDialogOpen(false);
      setSelectedCustomer(null);
      toast({
        title: 'Customer activated',
        description: 'Customer has been activated successfully.',
        variant: 'success',
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
        title: 'Customer archived',
        description: 'Customer has been marked as deleted successfully.',
        variant: 'success',
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

  const handleChangeRole = async (customerId: string, newRole: CustomerRole) => {
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

      setRoleChangeDialogOpen(false);
      setPendingRoleChange(null);
      setSelectedCustomer(null);
      toast({
        title: 'Role updated',
        description:
          newRole === 'courier'
            ? 'Courier role assigned successfully.'
            : 'Courier role removed successfully.',
        variant: 'success',
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

  const getRoleBadge = (role: string) => {
    if (role === 'courier') {
      return (
        <Badge className="border border-amber-500/40 bg-amber-500/15 text-amber-200">
          Courier
        </Badge>
      );
    }

    return <Badge variant="outline">Customer</Badge>;
  };

  const getRoleChangeDialogCopy = () => {
    if (!selectedCustomer || !pendingRoleChange) return '';

    return pendingRoleChange === 'courier'
      ? `Are you sure you want to assign ${selectedCustomer.name} as a Courier?`
      : `Are you sure you want to remove Courier role from ${selectedCustomer.name}?`;
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

  const getStatusBadge = (status: string) =>
    status === 'active' ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="destructive">Blocked</Badge>
    );

  const handleNewCustomerChange = (field: keyof typeof newCustomer, value: string) => {
    let newValue = value;
    if (field === 'phone') {
      newValue = value.replace(/\D/g, '');
    }
    setNewCustomer((prev) => ({ ...prev, [field]: newValue }));
    if (addCustomerError) setAddCustomerError(null);
  };

  const handleCreateCustomer = async () => {
    const { firstName, lastName, email, phone, password } = newCustomer;
  
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setAddCustomerError('First name, last name, email, and password are required.');
      return;
    }
  
    const { validatePhoneNumber } = await import('@/lib/utils/validation');
    if (phone.trim() && !validatePhoneNumber(phone.trim())) {
      setAddCustomerError('Please enter a valid 10-digit Philippine phone number starting with 9.');
      return;
    }

    setIsAddingCustomer(true);
    setAddCustomerError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('You must be logged in as an admin to create customers.');
      }

      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(newCustomer),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      toast({
        title: 'Customer created',
        description: 'The new customer has been added successfully.',
        variant: 'success',
      });
  
      setCreatedCustomerInfo({ name: `${firstName} ${lastName}`, email: email });
      setAddCustomerSuccess(true);
      setNewCustomer({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'customer',
      });
      refreshCustomers();
    } catch (err) {
      console.error('Failed to create customer', err);
      setAddCustomerError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setIsAddingCustomer(false);
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="default" 
              className="gap-2"
              onClick={() => setAddCustomerOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
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
                  Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
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
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setViewDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-sm">{customer.email}</TableCell>
                      <TableCell className="text-sm">{customer.phone}</TableCell>
                      <TableCell>{customer.orders}</TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(Number(customer.totalSpent))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(customer.role)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.joinDate}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <CustomerRowActions
                          customer={customer}
                          currentUserId={currentUserId}
                          currentUserIsSuperAdmin={currentUserIsSuperAdmin}
                          onViewDetails={() => {
                            setSelectedCustomer(customer);
                            setViewDetailsOpen(true);
                          }}
                          onEdit={() => {
                            setSelectedCustomer(customer);
                            setEditDialogOpen(true);
                          }}
                          onAssignCourier={() => {
                            setSelectedCustomer(customer);
                            setPendingRoleChange('courier');
                            setRoleChangeDialogOpen(true);
                          }}
                          onRemoveCourier={() => {
                            setSelectedCustomer(customer);
                            setPendingRoleChange('customer');
                            setRoleChangeDialogOpen(true);
                          }}
                          onDeactivate={() => {
                            setSelectedCustomer(customer);
                            setBlockDialogOpen(true);
                          }}
                          onActivate={() => {
                            setSelectedCustomer(customer);
                            setUnblockDialogOpen(true);
                          }}
                          onDelete={() => {
                            setSelectedCustomer(customer);
                            setDeleteDialogOpen(true);
                          }}
                        />
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
              Showing {totalCustomers > 0 ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, totalCustomers)} of {totalCustomers} customers
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm text-muted-foreground">Page</span>
                <span className="text-sm font-medium">{currentPage}</span>
                <span className="text-sm text-muted-foreground">of</span>
                <span className="text-sm font-medium">{totalPages}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCustomer?.role === 'courier' ? 'Delete Courier' : 'Delete Customer'}
            </AlertDialogTitle>
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
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="w-full max-w-[860px] max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <DialogHeader className="text-center py-6">
            <ModalTitle className="sr-only">Customer Details</ModalTitle>
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-blue-500">
                {selectedCustomer ? getInitials(selectedCustomer.name) : 'CU'}
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">{selectedCustomer?.name}</h2>
                <div className="mt-2 flex justify-center gap-2">{selectedCustomer && getRoleBadge(selectedCustomer.role)}</div>
              </div>
            </div>
          </DialogHeader>

          {selectedCustomer ? (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Circle className="h-3 w-3 mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                    {getStatusBadge(selectedCustomer.status)}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Join Date</p>
                    <p className="font-medium">{selectedCustomer.joinDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Orders</p>
                    <p className="font-medium">{selectedCustomer.orders}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
                    <p className="font-medium">{formatPrice(Number(selectedCustomer.totalSpent))}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No customer selected.</div>
          )}

          <div className="border-t border-border bg-muted/30 px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedCustomer) {
                  setEditDialogOpen(true);
                  setViewDetailsOpen(false);
                }
              }}
            >
              Edit Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <div className="relative mt-1">
                  <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-sm text-muted-foreground pointer-events-none">
                    <span role="img" aria-label="PH flag">🇵🇭</span>
                    <span>+63</span>
                  </div>
                  <Input 
                    defaultValue={selectedCustomer.phone}
                    maxLength={10}
                    placeholder="9123456789"
                    className="pl-16"
                  />
                </div>
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

      {/* Deactivate Customer Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCustomer?.role === 'courier' ? 'Deactivate' : 'Deactivate Customer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedCustomer?.name}? They will not be able to access their account until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedCustomer && handleBlockCustomer(selectedCustomer.id)} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {selectedCustomer?.role === 'courier' ? 'Deactivate' : 'Deactivate Customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Customer Confirmation Dialog */}
      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate {selectedCustomer?.name}? They will be able to access their account again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedCustomer && handleUnblockCustomer(selectedCustomer.id)}
            >
              Activate Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Confirmation Dialog */}
      <AlertDialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRoleChange === 'courier' ? 'Assign as Courier' : 'Remove Courier Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getRoleChangeDialogCopy()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedCustomer && pendingRoleChange && handleChangeRole(selectedCustomer.id, pendingRoleChange)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Customer Dialog */}
      <AlertDialog 
        open={addCustomerOpen} 
        onOpenChange={(open) => {
          setAddCustomerOpen(open);
          if (!open) {
            setAddCustomerSuccess(false);
            setCreatedCustomerInfo(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          {addCustomerSuccess ? (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-2">
                <Check className="w-8 h-8" />
              </div>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl">Customer Created Successfully</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-foreground/80">
                  <span className="font-semibold">{createdCustomerInfo?.name}</span> ({createdCustomerInfo?.email}) has been registered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3 text-left w-full border border-border">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Verification Email Sent</p>
                  <p className="text-muted-foreground">The customer must verify their email address before they can log in to their account.</p>
                </div>
              </div>
              <AlertDialogFooter className="w-full sm:flex-col gap-2">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setAddCustomerSuccess(false);
                    setCreatedCustomerInfo(null);
                  }}
                >
                  Create Another
                </Button>
                <AlertDialogCancel className="w-full mt-0">Close</AlertDialogCancel>
              </AlertDialogFooter>
            </div>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Add New Customer</AlertDialogTitle>
                <AlertDialogDescription>
                  Manually register a new customer account. They will receive a verification email to activate their account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Input
                        placeholder="First name"
                        value={newCustomer.firstName}
                        onChange={(e) => handleNewCustomerChange('firstName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Middle name"
                        value={newCustomer.middleName}
                        onChange={(e) => handleNewCustomerChange('middleName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Last name"
                        value={newCustomer.lastName}
                        onChange={(e) => handleNewCustomerChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email Address</label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={newCustomer.email}
                    onChange={(e) => handleNewCustomerChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-sm text-muted-foreground pointer-events-none">
                      <span role="img" aria-label="PH flag">🇵🇭</span>
                      <span>+63</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="9123456789"
                      value={newCustomer.phone}
                      maxLength={10}
                      onChange={(e) => handleNewCustomerChange('phone', e.target.value)}
                      className="pl-16"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Format: 9XXXXXXXXX (10 digits)</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Password</label>
                  <PasswordInput
                    placeholder="Minimum 6 characters"
                    value={newCustomer.password}
                    onChange={(e) => handleNewCustomerChange('password', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Role</label>
                  <Select
                    value={newCustomer.role}
                    onValueChange={(value) => handleNewCustomerChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="courier">Courier</SelectItem>
                    </SelectContent>
                  </Select>
                  {newCustomer.role === 'courier' && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium leading-snug">
                        ⚠️ Courier accounts are for delivery staff only. They will only have access to the Courier Dashboard.
                      </p>
                    </div>
                  )}
                </div>
                {addCustomerError && (
                  <p className="text-sm text-destructive">{addCustomerError}</p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleCreateCustomer} disabled={isAddingCustomer}>
                  {isAddingCustomer ? 'Creating...' : 'Create Customer'}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
