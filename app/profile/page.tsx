"use client";

import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/context/auth-context";
import { formatDate } from "@/lib/utils/formatting";
import { User, Settings, MapPin, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    router.push("/login");
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
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-6">
                <p className="text-sm">
                  <span className="text-muted-foreground">Member Since</span>
                  <br />
                  <span className="font-medium">{formatDate(user.memberSince)}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <br />
                  <span className="font-medium">{user.phone}</span>
                </p>
              </div>

              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Quick Actions */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/profile/edit"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 transition-colors text-center"
                  >
                    <User className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">Edit Profile</p>
                  </Link>
                  <Link
                    href="/profile/addresses"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 transition-colors text-center"
                  >
                    <MapPin className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">Manage Addresses</p>
                  </Link>
                  <Link
                    href="/orders"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 transition-colors text-center"
                  >
                    <span className="text-2xl">📦</span>
                    <p className="font-medium text-sm">View Orders</p>
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="p-4 border border-border rounded-lg hover:bg-secondary/10 transition-colors text-center"
                  >
                    <Settings className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">Settings</p>
                  </Link>
                </div>
              </div>

              {/* Account Overview */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Account Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                    <span className="text-sm">Total Orders</span>
                    <span className="font-bold text-primary">1</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                    <span className="text-sm">Total Spent</span>
                    <span className="font-bold text-primary">$309.99</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                    <span className="text-sm">Saved Addresses</span>
                    <span className="font-bold text-primary">{user.addresses.length}</span>
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
