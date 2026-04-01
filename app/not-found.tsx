"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, Home, ShoppingBag, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        {/* Animated Graphic */}
        <div className="relative mb-8 animate-float">
          <div className="w-64 h-64 bg-primary/5 rounded-full flex items-center justify-center border-4 border-dashed border-primary/20">
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary opacity-60"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
              <path d="m9.09 14.87.51.63a2.38 2.38 0 0 0 3.8 0l.51-.63" />
              <circle cx="9" cy="13" r="1" fill="currentColor" />
              <circle cx="15" cy="13" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-black text-2xl animate-bounce-subtle">
            ?
          </div>
        </div>

        {/* Text Content */}
        <div className="max-w-md space-y-4 mb-10">
          <h1 className="text-8xl font-black tracking-tighter text-primary">404</h1>
          <h2 className="text-3xl font-black tracking-tight">Oops! Page not found.</h2>
          <p className="text-muted-foreground text-lg font-medium">
            The page you&apos;re looking for doesn&apos;t exist<br />
            or may have been moved.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Button
            variant="outline"
            className="rounded-full px-8 h-12 font-bold flex items-center gap-2 border-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            className="rounded-full px-8 h-12 font-black uppercase tracking-widest text-[11px] flex items-center gap-2 shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
            asChild
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              Go to Homepage
            </Link>
          </Button>
        </div>

        {/* Quick Links Section */}
        <div className="w-full max-w-lg">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs font-black uppercase tracking-widest text-muted-foreground/50">
                You might be looking for:
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="flex items-center gap-2 px-5 py-2 bg-muted/50 hover:bg-muted rounded-full text-sm font-bold transition-colors border border-border/10"
            >
              <ShoppingBag className="w-4 h-4 text-primary" />
              Featured Products
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-2 px-5 py-2 bg-muted/50 hover:bg-muted rounded-full text-sm font-bold transition-colors border border-border/10"
            >
              <Package className="w-4 h-4 text-primary" />
              My Orders
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 px-5 py-2 bg-muted/50 hover:bg-muted rounded-full text-sm font-bold transition-colors border border-border/10"
            >
              <Info className="w-4 h-4 text-primary" />
              About Us
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
