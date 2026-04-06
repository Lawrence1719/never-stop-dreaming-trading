'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Shield,
  Ban,
  Trash2,
  Search,
  UserCheck,
  Star,
  Mail,
  Phone,
  Calendar,
  Clock,
  X,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/toaster';

type StaffRole = 'admin' | 'super_admin' | 'courier';
type StaffStatus = 'active' | 'inactive';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  joinDate: string;
  isCurrentUser: boolean;
  lastLogin?: string;
  totalOrdersManaged?: number;
  deletedAt?: string;
}

interface StaffFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole;
}

const emptyForm: StaffFormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'admin',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

const getAvatarColor = (role: StaffRole) => {
  if (role === 'super_admin') return 'bg-purple-500';
  if (role === 'courier') return 'bg-cyan-500';
  return 'bg-blue-500';
};

const formatLastLogin = (lastLogin?: string) => {
  if (!lastLogin) return 'Never';

  const now = new Date();
  const loginDate = new Date(lastLogin);
  const diffInMs = now.getTime() - loginDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

export default function StaffManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<StaffRole | null>(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<StaffFormState>(emptyForm);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const fetchStaff = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/staff?status=${activeTab}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (res.status === 403) {
        router.replace('/admin/settings');
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load staff');
      }

      const payload = await res.json();
      setStaff(payload.data || []);
      setCurrentUserId(payload.currentUser?.id || null);
      setCurrentUserIsSuperAdmin(payload.currentUser?.isSuperAdmin || false);
    } catch (err) {
      console.error('Failed to load staff', err);
      setError(err instanceof Error ? err.message : 'Failed to load staff');
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [activeTab]);

  const filteredStaff = useMemo(() => {
    if (!debouncedSearch) return staff;

    return staff.filter((member) =>
      `${member.name} ${member.email} ${member.phone} ${member.role}`.toLowerCase().includes(debouncedSearch)
    );
  }, [staff, debouncedSearch]);

  const formatJoinDate = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));

  const getRoleBadge = (role: StaffRole) => {
    if (role === 'super_admin') {
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1">
          <Star className="w-3 h-3 fill-white" />
          Super Admin
        </Badge>
      );
    }
    if (role === 'courier') {
      return (
        <Badge className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1">
          <Shield className="w-3 h-3 fill-white" />
          Courier
        </Badge>
      );
    }
    return <Badge variant="secondary">Admin</Badge>;
  };

  const getStatusBadge = (status: StaffStatus) =>
    status === 'active' ? <Badge variant="success">active</Badge> : <Badge variant="destructive">inactive</Badge>;

  const updateStaff = async (
    url: string,
    options: RequestInit,
    successMessage: string
  ): Promise<{ ok: boolean; payload?: Record<string, unknown> }> => {
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
      });

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Request failed');
      }

      toast({
        title: 'Success',
        description: successMessage,
        variant: 'success',
      });

      await fetchStaff();
      return { ok: true, payload };
    } catch (err) {
      console.error('Staff action failed', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'destructive',
      });
      return { ok: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStaff = async () => {
    const result = await updateStaff(
      '/api/admin/staff',
      {
        method: 'POST',
        body: JSON.stringify(addForm),
      },
      'Staff account created successfully.'
    );

    if (result.ok) {
      const warning = result.payload?.emailWarning;
      if (typeof warning === 'string' && warning.length > 0) {
        toast({
          title: 'Welcome email not sent',
          description: warning,
          variant: 'warning',
        });
      }
      setAddDialogOpen(false);
      setAddForm(emptyForm);
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;

    const success = await updateStaff(
      `/api/admin/staff/${selectedStaff.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      },
      'Staff member updated successfully.'
    );

    if (success.ok) {
      setEditDialogOpen(false);
      setSelectedStaff(null);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    const url = isPermanentDelete
      ? `/api/admin/staff/${selectedStaff.id}?hard=true`
      : `/api/admin/staff/${selectedStaff.id}`;

    const success = await updateStaff(
      url,
      { method: 'DELETE' },
      isPermanentDelete
        ? 'Staff account permanently deleted.'
        : 'Staff account moved to deleted tab.'
    );

    if (success.ok) {
      setDeleteDialogOpen(false);
      setIsPermanentDelete(false);
      setSelectedStaff(null);
    }
  };

  const handleRestoreStaff = async () => {
    if (!selectedStaff) return;

    const success = await updateStaff(
      `/api/admin/staff/${selectedStaff.id}`,
      { method: 'POST' },
      'Staff account restored successfully.'
    );

    if (success.ok) {
      setRestoreDialogOpen(false);
      setSelectedStaff(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedStaff) return;

    const success = await updateStaff(
      `/api/admin/staff/${selectedStaff.id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active: selectedStaff.status !== 'active' }),
      },
      selectedStaff.status === 'active'
        ? 'Staff account deactivated successfully.'
        : 'Staff account activated successfully.'
    );

    if (success.ok) {
      setStatusDialogOpen(false);
      setSelectedStaff(null);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedStaff || !pendingRole) return;

    const success = await updateStaff(
      `/api/admin/staff/${selectedStaff.id}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          role: pendingRole,
          currentPassword: pendingRole === 'super_admin' ? passwordConfirm : undefined,
        }),
      },
      pendingRole === 'super_admin'
        ? 'Staff member promoted to Super Admin.'
        : 'Staff member demoted to Admin.'
    );

    if (success.ok) {
      setRoleDialogOpen(false);
      setPendingRole(null);
      setPasswordConfirm('');
      setSelectedStaff(null);
    }
  };

  const openEditDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditForm({
      name: member.name,
      phone: member.phone === '-' ? '' : member.phone,
    });
    setEditDialogOpen(true);
  };

  if (!isLoading && !currentUserIsSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage admin and courier accounts and their permissions</p>
        </div>
        {activeTab === 'active' && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Staff</TabsTrigger>
          {currentUserIsSuperAdmin && (
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Deleted
            </TabsTrigger>
          )}
        </TabsList>

        <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Review admin, super admin, and courier accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search staff by name, email, or role..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {activeTab === 'active' ? (
                    <TableHead>Join Date</TableHead>
                  ) : (
                    <>
                      <TableHead>Deleted On</TableHead>
                      <TableHead>Days Left</TableHead>
                    </>
                  )}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`staff-loading-${index}`} className="animate-pulse">
                      <TableCell><div className="h-4 w-28 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-40 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-28 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-20 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-20 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-28 rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-8 rounded bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No staff accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((member) => {
                    const isSelf = member.id === currentUserId || member.isCurrentUser;
                    const canDeactivate = !(isSelf && member.role === 'super_admin');
                    const showDelete = !isSelf;

                    return (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => {
                          setSelectedStaff(member);
                          setViewDetailsOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{getRoleBadge(member.role)}</TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                        {activeTab === 'active' ? (
                          <TableCell>{formatJoinDate(member.joinDate)}</TableCell>
                        ) : (
                          <>
                            <TableCell>{member.deletedAt ? formatJoinDate(member.deletedAt) : '-'}</TableCell>
                            <TableCell>
                              {member.deletedAt ? (
                                (() => {
                                  const daysLeft = Math.ceil(
                                    (new Date(member.deletedAt).getTime() + 30 * 86400000 - Date.now()) / 86400000
                                  );
                                  return (
                                    <span className={daysLeft <= 7 ? 'font-bold text-destructive' : 'font-medium'}>
                                      {daysLeft} days
                                    </span>
                                  );
                                })()
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                {activeTab === 'active' ? (
                                  <>
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => {
                                        setSelectedStaff(member);
                                        setViewDetailsOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(member)}>
                                      <Edit className="h-4 w-4" />
                                      Edit Staff
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {member.role === 'admin' ? (
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                          setSelectedStaff(member);
                                          setPendingRole('super_admin');
                                          setPasswordConfirm('');
                                          setRoleDialogOpen(true);
                                        }}
                                      >
                                        <Shield className="h-4 w-4" />
                                        Promote to Super Admin
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                          setSelectedStaff(member);
                                          setPendingRole('admin');
                                          setPasswordConfirm('');
                                          setRoleDialogOpen(true);
                                        }}
                                      >
                                        <Shield className="h-4 w-4" />
                                        Demote to Admin
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {canDeactivate ? (
                                      <DropdownMenuItem
                                        className={member.status === 'active' ? 'gap-2 text-destructive' : 'gap-2'}
                                        onClick={() => {
                                          setSelectedStaff(member);
                                          setStatusDialogOpen(true);
                                        }}
                                      >
                                        {member.status === 'active' ? (
                                          <Ban className="h-4 w-4" />
                                        ) : (
                                          <UserCheck className="h-4 w-4" />
                                        )}
                                        {member.status === 'active' ? 'Deactivate' : 'Activate'}
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
                                        <Ban className="h-4 w-4" />
                                        Deactivate
                                      </DropdownMenuItem>
                                    )}
                                    {showDelete && currentUserIsSuperAdmin && (
                                      <DropdownMenuItem
                                        className="gap-2 text-destructive"
                                        onClick={() => {
                                          setSelectedStaff(member);
                                          setIsPermanentDelete(false);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => {
                                        setSelectedStaff(member);
                                        setRestoreDialogOpen(true);
                                      }}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      Restore Access
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="gap-2 text-destructive font-semibold"
                                      onClick={() => {
                                        setSelectedStaff(member);
                                        setIsPermanentDelete(true);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Permanent Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </Tabs>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>Create a new admin, super admin, or courier account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full Name</Label>
              <Input
                id="staff-name"
                value={addForm.name}
                onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={addForm.email}
                onChange={(event) => setAddForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                maxLength={10}
                value={addForm.phone}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, '') }))
                }
                placeholder="9123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <PasswordInput
                id="staff-password"
                value={addForm.password}
                onChange={(event) => setAddForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value as StaffRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStaff} disabled={isSubmitting}>Create Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
            <DialogDescription>Update the staff member&apos;s basic profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-staff-name">Full Name</Label>
              <Input
                id="edit-staff-name"
                value={editForm.name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-staff-phone">Phone</Label>
              <Input
                id="edit-staff-phone"
                maxLength={10}
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, '') }))
                }
                placeholder="9123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={selectedStaff?.email || ''} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditStaff} disabled={isSubmitting}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-center pb-6">
            <DialogTitle className="sr-only">Staff Details - {selectedStaff?.name}</DialogTitle>
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ${getAvatarColor(selectedStaff?.role || 'admin')}`}>
                {selectedStaff ? getInitials(selectedStaff.name) : ''}
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{selectedStaff?.name}</h2>
                <div className="mt-2">
                  {selectedStaff && getRoleBadge(selectedStaff.role)}
                </div>
              </div>
            </div>
          </DialogHeader>

          {selectedStaff && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStaff.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedStaff.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedStaff.status)}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="font-medium">{formatJoinDate(selectedStaff.joinDate)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">{formatLastLogin(selectedStaff.lastLogin)}</p>
                </div>
              </div>

              {selectedStaff.totalOrdersManaged !== undefined && (
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Orders Managed</p>
                    <p className="font-medium">{selectedStaff.totalOrdersManaged.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
            <div className="flex space-x-2">
              {currentUserIsSuperAdmin && selectedStaff && selectedStaff.role === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingRole('super_admin');
                    setPasswordConfirm('');
                    setRoleDialogOpen(true);
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Promote
                </Button>
              )}
              {currentUserIsSuperAdmin && selectedStaff && selectedStaff.role === 'super_admin' && !selectedStaff.isCurrentUser && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingRole('admin');
                    setPasswordConfirm('');
                    setRoleDialogOpen(true);
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Demote
                </Button>
              )}
              <Button
                onClick={() => {
                  setViewDetailsOpen(false);
                  openEditDialog(selectedStaff!);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Staff
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRole === 'super_admin' ? 'Promote to Super Admin' : 'Demote to Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole === 'super_admin'
                ? `Are you sure you want to promote ${selectedStaff?.name} to Super Admin?`
                : `Are you sure you want to demote ${selectedStaff?.name} to Admin?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRole === 'super_admin' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm with your password</Label>
              <PasswordInput
                id="confirm-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Enter your current password"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={isSubmitting}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isPermanentDelete ? 'text-destructive' : ''}>
              {isPermanentDelete ? (
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  PERMANENT DELETE
                </div>
              ) : (
                'Delete Staff Member'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPermanentDelete
                ? `WARNING: This will permanently erase ${selectedStaff?.name} and ALL their associated data from the system. This action is irreversible.`
                : `Are you sure you want to delete ${selectedStaff?.name}? Their account will be moved to the deleted tab for 30 days.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteStaff}
            >
              {isPermanentDelete ? 'Permanently Delete' : 'Delete Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Staff Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {selectedStaff?.name}&apos;s access? They will be able to log in again immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreStaff}>Restore Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStaff?.status === 'active' ? 'Deactivate Staff' : 'Activate Staff'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStaff?.status === 'active'
                ? `Are you sure you want to deactivate ${selectedStaff?.name}?`
                : `Are you sure you want to activate ${selectedStaff?.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus} disabled={isSubmitting}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
