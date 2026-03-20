"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { User, Settings, LogOut, MapPin, CreditCard, Package, Shield, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { formatDate, formatPrice, formatRelativeTime } from "@/lib/utils/formatting";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { toast } = useToast();
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Fetch user statistics
  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setIsLoadingStats(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      // Fetch orders
      const ordersResponse = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = Array.isArray(ordersData.data) ? ordersData.data : 
                       Array.isArray(ordersData.orders) ? ordersData.orders : [];
        
        setTotalOrders(orders.length);
        
        // Calculate total spent only from non-cancelled/non-failed orders
        const validOrders = orders.filter((o: any) => 
          o.status !== 'cancelled' && o.status !== 'failed' && o.status !== 'unpaid'
        );
        
        const spent = validOrders.reduce((sum: number, order: any) => {
          const orderTotal = Number(order.total) || 0;
          return sum + orderTotal;
        }, 0);
        
        setTotalSpent(spent);
      }

      // Fetch addresses
      const addressesResponse = await fetch('/api/addresses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (addressesResponse.ok) {
        const addressesData = await addressesResponse.json();
        // The API returns { addresses: [...] }
        const addresses = addressesData.addresses || addressesData.data || [];
        setSavedAddresses(addresses.length);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">My Account</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* User Info Card */}
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xl border-2 border-primary/20">
                  {user.name ? getInitials(user.name) : <User className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold truncate">{user.name}</h2>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-border/60 pt-4 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Member Status</span>
                  <span className="text-[11px] font-bold text-primary px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">
                    {formatRelativeTime(user.memberSince)}
                  </span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Phone</span>
                  <span className="text-xs font-medium text-foreground/80">{user.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <button
                  onClick={async () => {
                    try {
                      await logout();
                      toast({
                        title: "Logged out",
                        description: "You have been logged out successfully.",
                        variant: "success",
                      });
                      router.push("/");
                    } catch (error) {
                      console.error("Logout error:", error);
                      toast({
                        title: "Error",
                        description: "Failed to logout. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 hover:bg-destructive/5 rounded-lg transition-all text-xs font-semibold group shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Link
                    href="/profile/edit"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary/30 transition-all text-center group"
                  >
                    <User className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-medium text-xs">Edit Profile</p>
                  </Link>
                  <Link
                    href="/profile/addresses"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary/30 transition-all text-center group"
                  >
                    <MapPin className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-medium text-xs">Address Book</p>
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin/dashboard"
                      className="p-4 border border-primary/20 bg-primary/5 rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-all text-center group shadow-sm"
                    >
                      <LayoutDashboard className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                      <p className="font-bold text-xs text-primary">Admin Panel</p>
                    </Link>
                  )}
                  <Link
                    href="/orders"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary/30 transition-all text-center group"
                  >
                    <Package className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-medium text-xs">Order History</p>
                  </Link>
                  <Link
                    href="/profile/security"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary/30 transition-all text-center group"
                  >
                    <Shield className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-medium text-xs">Security Settings</p>
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary/30 transition-all text-center group"
                  >
                    <Settings className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-medium text-xs">Account Settings</p>
                  </Link>
                </div>
              </div>

              {/* Account Overview */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Account Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                    <span className="text-sm">Total Orders</span>
                    <span className="font-bold text-primary">{totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                    <span className="text-sm">Total Spent</span>
                    <span className="font-bold text-primary">{formatPrice(totalSpent)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                    <span className="text-sm">Saved Addresses</span>
                    <span className="font-bold text-primary">{savedAddresses}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
