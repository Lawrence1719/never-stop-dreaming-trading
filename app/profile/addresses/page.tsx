"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, MapPin, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressDialog, AddressFormData } from "@/components/ecommerce/address-dialog";
import { Address } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AddressesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const MAX_ADDRESSES = 5; // Realistic limit for saved addresses

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch addresses
  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        router.push("/login");
        return;
      }

      const response = await fetch('/api/addresses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({ title: "Error", description: "Failed to load addresses", variant: "destructive" });
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddNew = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      toast({ 
        title: "Address Limit Reached", 
        description: `You can only save up to ${MAX_ADDRESSES} addresses. Please delete an existing address to add a new one.`, 
        variant: "destructive" 
      });
      return;
    }
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleSaveAddress = async (formData: AddressFormData) => {
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        router.push("/login");
        return;
      }

      let isUpdate = false;
      if (editingAddress) {
        // Update existing address
        isUpdate = true;
        const response = await fetch(`/api/addresses/${editingAddress.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to update address' }));
          throw new Error(errorData.error || 'Failed to update address');
        }
      } else {
        // Create new address
        const response = await fetch('/api/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to create address' }));
          throw new Error(errorData.error || 'Failed to create address');
        }
      }

      // Show success notification
      const successMessage = isUpdate ? "Address updated successfully" : "Address added successfully";
      toast({ 
        title: "Success", 
        description: successMessage,
        variant: "success",
      });
      
      setDialogOpen(false);
      setEditingAddress(null);
      await fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast({ title: "Error", description: "Failed to save address", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (addressId: string) => {
    setAddressToDelete(addressId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;

    try {
      setIsDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/addresses/${addressToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete address');
      }

      // Show success notification
      toast({ 
        title: "Success", 
        description: "Address deleted successfully",
        variant: "success",
      });
      
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
      await fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete address", 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/addresses/${addressId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update default address' }));
        throw new Error(errorData.error || 'Failed to update default address');
      }

      toast({ 
        title: "Success", 
        description: "Default address updated successfully",
        variant: "success",
      });
      
      await fetchAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update default address", 
        variant: "destructive" 
      });
    }
  };

  if (authLoading || isLoadingAddresses) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Address Book</h1>
            {addresses.length > 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {addresses.length} of {MAX_ADDRESSES} addresses saved
              </p>
            )}
          </div>

          {addresses.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No saved addresses</h3>
              <p className="text-muted-foreground mb-6">
                Add an address to make checkout faster and easier.
              </p>
              <Button className="gap-2" onClick={handleAddNew}>
                <Plus className="w-4 h-4" />
                Add Your First Address
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:border-primary/50 transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin className="w-5 h-5 text-primary shrink-0" />
                        <h3 className="font-semibold truncate">{address.label}</h3>
                        {address.default && (
                          <Badge variant="default" className="shrink-0">Default</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(address)}
                          title="Edit address"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(address.id)}
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{address.street}</p>
                      <p>
                        {address.city}, {address.province} {address.zip}
                      </p>
                    </div>
                    {!address.default && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4 text-xs h-9"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {addresses.length < MAX_ADDRESSES && (
                <div className="mt-8 flex justify-center">
                  <Button 
                    variant="outline" 
                    className="gap-2 w-full sm:w-auto border-dashed hover:border-primary" 
                    onClick={handleAddNew}
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Address
                  </Button>
                </div>
              )}
              
              {addresses.length >= MAX_ADDRESSES && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    You've reached the maximum of {MAX_ADDRESSES} saved addresses. Delete an address to add a new one.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
      
      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveAddress}
        address={editingAddress}
        isLoading={isSaving}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

