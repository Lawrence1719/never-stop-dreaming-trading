"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { ChevronDown, LogOut, Loader2 } from 'lucide-react';
import { useToast, ToastContainer } from "@/components/ui/toast";

export function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <div
            className={`flex gap-2 items-center ${
              isLoading ? "opacity-70 pointer-events-none" : ""
            }`}
          >
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Register
            </Link>
          </div>
          {isLoading && (
            <Loader2
              className="w-4 h-4 text-muted-foreground animate-spin"
              aria-label="Checking authentication status"
            />
          )}
        </div>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logout();
      addToast("Logged out successfully", "success");
      // Redirect to home page after a brief delay to show the toast
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      addToast("Failed to logout. Please try again.", "error");
    }
  };

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
        >
          {user.name.split(" ")[0]}
          <ChevronDown className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-secondary/10 transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-secondary/10 transition-colors"
            >
              My Orders
            </Link>
            <Link
              href="/profile/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-secondary/10 transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/10 transition-colors flex items-center gap-2 text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
