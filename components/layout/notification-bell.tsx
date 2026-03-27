"use client";

import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Bell, Check, Info, AlertTriangle, AlertCircle, ShoppingBag, Package, ChevronRight, CheckCheck, User } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NotificationBell({ targetRole = 'customer' }: { targetRole?: 'customer' | 'admin' }) {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(targetRole, { limit: 10 });
  const [open, setOpen] = useState(false);

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success': return "border-green-500 bg-green-50 text-green-600";
      case 'warning': return "border-amber-500 bg-amber-50 text-amber-600";
      case 'error': return "border-red-500 bg-red-50 text-red-600";
      case 'order': return "border-blue-500 bg-blue-50 text-blue-600";
      case 'stock': return "border-orange-500 bg-orange-50 text-orange-600";
      case 'user': return "border-purple-500 bg-purple-50 text-purple-600";
      default: return "border-blue-500 bg-blue-50 text-blue-600";
    }
  };

  const getIcon = (type: Notification['type']) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'success': return <Check className={iconClass} />;
      case 'warning': return <AlertTriangle className={iconClass} />;
      case 'error': return <AlertCircle className={iconClass} />;
      case 'order': return <Package className={iconClass} />;
      case 'stock': return <ShoppingBag className={iconClass} />;
      case 'user': return <User className={iconClass} />;
      default: return <Info className={iconClass} />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-accent/50 transition-all duration-300">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 shrink-0 transition-all">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
               <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[9px] font-bold text-primary-foreground items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
               </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[calc(100vw-32px)] sm:w-96 p-0 shadow-2xl rounded-xl border-border bg-background shadow-primary/5 overflow-hidden animate-in zoom-in-95 duration-200 z-[100]"
      >
        {/* Dropdown Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-full px-2 h-5 text-[10px] font-bold">
                {unreadCount}
              </Badge>
            )}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              markAllAsRead();
            }}
            className="text-[11px] font-bold text-primary hover:underline transition-all"
          >
            Mark all as read
          </button>
        </div>
        
        {/* Notifications List */}
        <div className="max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 transition-all">
          {notifications.length === 0 ? (
            <div className="py-16 px-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 bg-muted/5 rounded-full flex items-center justify-center mb-1">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="font-medium text-foreground/80">No notifications yet</p>
              <p className="text-xs text-muted-foreground">You're all caught up! 🎉</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/20">
              {notifications.map((notification) => {
                const styles = getTypeStyles(notification.type);
                const borderColor = styles.split(' ')[0];
                const bgColor = styles.split(' ')[1];
                const iconColor = styles.split(' ')[2];

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex items-stretch p-0 cursor-pointer border-l-[3px] focus:bg-accent transition-all duration-200 group outline-none",
                      borderColor,
                      !notification.is_read ? "bg-primary/[0.03]" : "bg-transparent"
                    )}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!notification.is_read) markAsRead(notification.id);
                      
                      // Handle navigation based on type
                      let targetLink = notification.link;
                      if (!targetLink) {
                        if (notification.type === 'order') targetLink = '/admin/orders';
                        else if (notification.type === 'stock') targetLink = '/admin/inventory';
                        else if (notification.type === 'user') targetLink = '/admin/customers';
                      }

                      if (targetLink) {
                        router.push(targetLink);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex flex-1 items-start gap-4 p-4 pr-5">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm",
                        bgColor,
                        iconColor
                      )}>
                        {getIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex flex-1 flex-col min-w-0 pr-1">
                         <div className="flex items-start justify-between gap-2">
                           <h5 className={cn(
                             "text-[13px] font-semibold leading-tight pr-2 transition-colors",
                             !notification.is_read ? "text-foreground" : "text-muted-foreground"
                           )}>
                             {notification.title}
                           </h5>
                           {!notification.is_read && (
                             <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0 animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                           )}
                         </div>
                         <p className={cn(
                           "text-[12px] mt-1 break-words leading-normal",
                           !notification.is_read ? "text-foreground/80" : "text-muted-foreground/70"
                         )}>
                           {notification.message}
                         </p>
                         <p className="text-[11px] text-muted-foreground/60 mt-2 font-medium">
                           {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                         </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 self-center shrink-0 group-hover:translate-x-1 transition-transform ml-auto" />
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Dropdown Footer */}
        <div className="border-t border-border/40">
           <Link 
            href={targetRole === 'admin' ? "/admin/notifications" : "/notifications"} 
            className="flex items-center justify-center w-full py-4 text-[12px] font-bold text-primary hover:bg-primary/5 transition-all gap-2"
            onClick={() => setOpen(false)}
          >
            <span>See all notifications</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
