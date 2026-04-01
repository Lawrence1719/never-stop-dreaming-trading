"use client";

import Link from "next/link";
import { ChevronRight, Package, Truck, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils/formatting";
import { Order } from "@/lib/types";
import { ProductImage } from "@/components/shared/ProductImage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: Order;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Package,
    color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50",
    dot: "bg-blue-500"
  },
  processing: {
    label: "Processing",
    icon: Package,
    color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50",
    dot: "bg-blue-500"
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/50",
    dot: "bg-yellow-500"
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50",
    dot: "bg-emerald-500"
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/50",
    dot: "bg-rose-500"
  }
};

export function OrderCard({ order }: OrderCardProps) {
  const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Link 
      href={`/orders/${order.id}`}
      className="block bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] group overflow-hidden cursor-pointer"
    >
      {/* Card Header: Order ID & Date & Badge */}
      <div className="p-3 flex justify-between items-start gap-2">
        <div className="space-y-0.5">
          <p className="font-black text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
            {order.orderNumber}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">
            {formatDate(order.date)}
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={cn("px-2 py-0 rounded-md border text-[9px] font-black h-5 uppercase tracking-widest shrink-0", 
            order.status === 'delivered' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
            order.status === 'cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" :
            order.status === 'shipped' ? "bg-amber-50 text-amber-600 border-amber-100" :
            "bg-blue-50 text-blue-600 border-blue-100"
          )}
        >
          {config.label}
        </Badge>
      </div>

      <div className="border-t border-border/50 mx-3" />

      {/* Card Body: Product Info */}
      <div className="p-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border/40">
          <ProductImage 
            src={firstItem?.image} 
            alt={firstItem?.name || "Product"} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            containerClassName="!p-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate text-foreground uppercase tracking-tight">
            {firstItem?.name || "Order Items"}
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase opacity-60">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} 
            <span className="mx-1">•</span>
            {formatPrice(firstItem?.price || 0)} ea
          </p>
        </div>
      </div>

      <div className="border-t border-border/50 mx-3" />

      {/* Card Footer: Total & Details */}
      <div className="p-3 py-2.5 flex items-center justify-between">
        <p className="font-black text-sm md:text-base text-foreground tracking-tight">
          {formatPrice(order.total)}
        </p>
        <div className="flex items-center gap-1 text-primary">
          <span className="text-[10px] font-black uppercase tracking-widest group-hover:underline">Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}
