"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchX, ArrowLeft, LayoutDashboard, ShoppingBag, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[20rem] font-black text-muted/20 tracking-tighter leading-none">
          404
        </span>
      </div>

      <div className="relative z-10 space-y-6 max-w-md">
        {/* Animated Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted border border-border/50 shadow-inner mb-2 animate-bounce-subtle">
          <SearchX className="w-10 h-10 text-muted-foreground/60" />
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            404 — Page Not Found
          </h1>
          <p className="text-muted-foreground font-medium">
            This page doesn&apos;t exist in the admin panel.<br />
            It may have been moved or the URL is incorrect.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 py-2">
          <Button
            variant="ghost"
            className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 hover:bg-muted"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            className="rounded-xl px-6 h-11 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-sm"
            asChild
          >
            <Link href="/admin/dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Quick Links Row */}
        <div className="pt-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              Quick Navigation
            </span>
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              Orders
            </Link>
            <Link
              href="/admin/products"
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Products
            </Link>
            <Link
              href="/admin/customers"
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Customers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
