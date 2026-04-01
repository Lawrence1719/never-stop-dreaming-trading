"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface OrdersFiltersProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  statusCounts: Record<string, number>;
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function OrdersFilters({ 
  currentStatus, 
  onStatusChange, 
  onSearchChange,
  statusCounts 
}: OrdersFiltersProps) {
  const [search, setSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, onSearchChange]);

  return (
    <div className="space-y-3 sticky top-[64px] z-20 bg-background/95 backdrop-blur-sm pb-2 border-b border-border/40">
      {/* Custom Tabs (Horizontal Scroll on Mobile, Flex on Desktop) */}
      <div className="overflow-x-auto md:overflow-visible scrollbar-hide">
        <div className="flex items-center gap-1 md:gap-4 min-w-max md:min-w-0 border-b border-border/40">
          {TABS.map((tab) => {
            const isActive = currentStatus === tab.id;
            const count = statusCounts[tab.id] || 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => onStatusChange(tab.id)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 px-3 py-2 transition-all whitespace-nowrap group",
                  "text-sm font-bold md:px-0 md:py-2.5",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="uppercase tracking-tight">{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black transition-colors",
                    isActive 
                      ? "bg-primary text-white" 
                      : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
                  )}>
                    {count}
                  </span>
                )}
                
                {/* Desktop Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search by Order ID or Product..."
          className="pl-9 h-9 bg-muted/40 border-border/50 rounded-lg text-sm focus-visible:ring-primary/20 focus-visible:border-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
