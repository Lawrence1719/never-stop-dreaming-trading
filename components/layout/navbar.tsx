"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from "@/lib/context/cart-context";
import { useWishlist } from "@/lib/context/wishlist-context";
import { useAuth } from "@/lib/context/auth-context";
import { SearchModal } from "./search-modal";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { user } = useAuth();

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = user ? wishlist.length : 0;

  return (
    <>
      <nav className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">NSD</span>
                </div>
                <span className="font-bold text-lg hidden sm:inline">Never Stop Dreaming</span>
              </Link>

              {/* Desktop Navigation */}
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
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
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

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Menu */}
              <div className="hidden sm:block">
                <UserMenu />
              </div>

              {/* Mobile Menu */}
              <MobileDrawer />
            </div>
          </div>
        </div>
      </nav>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
