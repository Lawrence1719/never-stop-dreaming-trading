"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, X } from 'lucide-react';
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./theme-toggle";

export function MobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const links = [
    { id: "home", label: "Home", href: "/" },
    { id: "products", label: "Products", href: "/products" },
    { id: "categories", label: "Categories", href: "/products" },
    { id: "orders", label: "Orders", href: "/orders" },
    { id: "about", label: "About", href: "/about" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2 rounded-md bg-secondary text-secondary-foreground"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 overflow-y-auto">
            <div className="p-4 border-b border-border">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <div className="relative w-8 h-8">
                  <Image
                    src="/Logo_NSD1.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-bold">NSD Trading</span>
              </Link>
            </div>
            <div className="p-4 space-y-4">
              {user && (
                <div className="pb-4 border-b border-border space-y-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <nav className="space-y-1 pt-2">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 rounded-md hover:bg-secondary/10 transition-colors text-sm"
                      onClick={() => setIsOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-4 py-2 rounded-md hover:bg-secondary/10 transition-colors text-sm"
                      onClick={() => setIsOpen(false)}
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/profile/settings"
                      className="block px-4 py-2 rounded-md hover:bg-secondary/10 transition-colors text-sm"
                      onClick={() => setIsOpen(false)}
                    >
                      Settings
                    </Link>
                  </nav>
                </div>
              )}

              <nav className="space-y-2">
                {links.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="block px-4 py-2 rounded-md hover:bg-secondary/10 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>

                {user ? (
                  <button
                    onClick={async () => {
                      setIsOpen(false);
                      try {
                        await logout();
                        toast({
                          title: "Logged out",
                          description: "You have been logged out successfully.",
                          variant: "success",
                        });
                        // Delay to ensure toast is visible before redirect
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        router.push("/");
                        router.refresh();
                      } catch (error) {
                        console.error("Logout error:", error);
                        toast({
                          title: "Error",
                          description: "Failed to logout. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm font-medium"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block px-4 py-2 text-center bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="block px-4 py-2 text-center border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors text-sm font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}