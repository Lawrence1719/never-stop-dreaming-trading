"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { ChevronDown, LogOut } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      <div className="flex gap-2">
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
    );
  }

  return (
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
            className="block px-4 py-2 text-sm hover:bg-secondary/10 transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/orders"
            className="block px-4 py-2 text-sm hover:bg-secondary/10 transition-colors"
          >
            My Orders
          </Link>
          <Link
            href="/profile/settings"
            className="block px-4 py-2 text-sm hover:bg-secondary/10 transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/10 transition-colors flex items-center gap-2 text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
