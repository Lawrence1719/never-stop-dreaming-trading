"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { User, Settings, LogOut, MapPin, Package, Shield, ShieldCheck, LayoutDashboard, Bell } from 'lucide-react';
import { formatPrice, formatRelativeTime } from "@/lib/utils/formatting";
import { useNotifications } from "@/hooks/use-notifications";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useNotifications('customer', { limit: 1 });
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
    return <LoadingScreen message="My Account" subMessage="Loading your profile..." />;
  }

  if (!user) {
    return null;
  }

  const memberDurationShort = user.memberSince
    ? formatRelativeTime(user.memberSince).replace(/^Member for\s+/i, "")
    : "—";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-4">My Account</h1>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left: profile + stats */}
            <aside className="w-full lg:w-80 lg:max-w-xs lg:shrink-0">
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-fit">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl border-2 border-primary/20">
                    {user.name ? getInitials(user.name) : <User className="w-9 h-9" />}
                  </div>
                  <h2 className="font-bold text-lg mt-4">{user.name}</h2>
                  <div className="mt-2 flex justify-center">
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {user.role === "courier" ? "Courier" : "Customer"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 break-all max-w-full">{user.email}</p>
                </div>

                <div className="border-t border-border pt-5 mt-6 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Member info
                  </p>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground shrink-0">Member Status</span>
                    <span className="font-medium text-right tabular-nums">{memberDurationShort}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground shrink-0">Phone</span>
                    <span className="font-medium text-foreground/90 text-right break-all">
                      {user.phone || "Not provided"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-5 mt-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Account overview
                  </p>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Total Orders</span>
                    <span className="font-bold text-primary tabular-nums">{totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-bold text-primary tabular-nums">{formatPrice(totalSpent)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Saved Addresses</span>
                    <span className="font-bold text-primary tabular-nums">{savedAddresses}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-5 mt-5">
                  <button
                    type="button"
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
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </aside>

            {/* Right: actions */}
            <div className="flex-1 min-w-0 w-full">
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/profile/edit"
                  className="rounded-xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/20 transition-colors hover:border-primary/30"
                >
                  <User className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-sm font-medium mt-3">Edit Profile</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    Update your personal info
                  </span>
                </Link>
                <Link
                  href="/profile/addresses"
                  className="rounded-xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/20 transition-colors hover:border-primary/30"
                >
                  <MapPin className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-sm font-medium mt-3">Address Book</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    Manage delivery addresses
                  </span>
                </Link>
                <Link
                  href="/orders"
                  className="rounded-xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/20 transition-colors hover:border-primary/30"
                >
                  <Package className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-sm font-medium mt-3">Order History</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    View your past orders
                  </span>
                </Link>
                <Link
                  href="/notifications"
                  className="rounded-xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/20 transition-colors hover:border-primary/30 relative"
                >
                  <div className="relative flex h-6 w-6 items-center justify-center shrink-0">
                    <Bell className="w-6 h-6 text-primary" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[1rem] h-4 px-0.5 flex items-center justify-center font-bold border border-background animate-in zoom-in">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium mt-3">Notifications</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    Check your alerts
                  </span>
                </Link>
                <Link
                  href="/profile/security"
                  className="rounded-xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/20 transition-colors hover:border-primary/30"
                >
                  <Shield className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-sm font-medium mt-3">Security Settings</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    Password & security
                  </span>
                </Link>
                <Link
                  href="/profile/settings"
                  className="rounded-xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:bg-muted/20 transition-colors hover:border-primary/30"
                >
                  <Settings className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-sm font-medium mt-3">Account Settings</span>
                  <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    Preferences & settings
                  </span>
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    className="col-span-2 rounded-xl border border-primary/30 bg-primary/5 p-6 flex flex-col items-center text-center cursor-pointer hover:bg-primary/10 transition-colors hover:border-primary/50"
                  >
                    <LayoutDashboard className="w-6 h-6 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-primary mt-3">Admin Panel</span>
                    <span className="text-xs text-muted-foreground mt-1.5 leading-snug">
                      Manage your store
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
