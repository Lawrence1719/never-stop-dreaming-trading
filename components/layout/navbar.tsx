"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from "@/lib/context/cart-context";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useAuth } from "@/lib/context/auth-context";
import { useSettings } from "@/lib/hooks/use-settings";
import { SearchModal } from "./search-modal";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { NotificationBell } from "./notification-bell";
import { Logo } from "@/components/ui/logo";

interface NavbarProps {
  minimal?: boolean;
}

export function Navbar({ minimal = false }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = user ? wishlist.length : 0;
  const storeName = settings?.general.storeName || 'Never Stop Dreaming';

  return (
    <>
      <nav className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Side: Logo + Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-1.5">
                <Logo variant="square" priority />
                <span className="font-bold text-lg hidden sm:inline">{storeName}</span>
              </Link>

              {/* Desktop Navigation */}
              {!minimal && (
                <nav className="hidden lg:flex items-center gap-6">
                  <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                    Home
                  </Link>
                  <Link
                    href="/products"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Products
                  </Link>
                  <Link
                    href="/about"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    About
                  </Link>
                </nav>
              )}
            </div>

            {/* Right Side: Action Icons */}
            <div className="flex items-center gap-4">
              {!minimal ? (
                <>
                  {/* Search */}
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 rounded-md hover:bg-secondary/10 transition-colors hidden sm:flex items-center justify-center"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Wishlist */}
                  <Link
                    href="/wishlist"
                    className="p-2 rounded-md hover:bg-secondary/10 transition-colors relative"
                    aria-label="Wishlist"
                  >
                    <Heart className="w-5 h-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Cart */}
                  <Link
                    href="/cart"
                    className="p-2 rounded-md hover:bg-secondary/10 transition-colors relative"
                    aria-label="Shopping cart"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {/* Notifications */}
                  <NotificationBell />

                  {/* Theme Toggle */}
                  <ThemeToggle />

                  {/* User Menu */}
                  <div className="hidden sm:block">
                    <UserMenu />
                  </div>

                  {/* Mobile Menu */}
                  <MobileDrawer />
                </>
              ) : (
                <ThemeToggle />
              )}
            </div>
          </div>
        </div>
      </nav>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
