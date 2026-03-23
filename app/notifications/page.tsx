"use client";

import { useState } from "react";
import { 
  Bell, 
  Check, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  ShoppingBag, 
  Package,
  Trash2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const PAGE_SIZE = 15;

  const { 
    notifications, 
    unreadCount, 
    totalCount,
    loading,
    markAsRead, 
    markAllAsRead,
    deleteNotification
  } = useNotifications('customer', { 
    page, 
    limit: PAGE_SIZE, 
    filter 
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'order': return <Package className="w-5 h-5" />;
      case 'stock': return <ShoppingBag className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success': return "border-green-500 bg-green-50 text-green-600";
      case 'warning': return "border-amber-500 bg-amber-50 text-amber-600";
      case 'error': return "border-red-500 bg-red-50 text-red-600";
      case 'order': return "border-blue-500 bg-blue-50 text-blue-600";
      case 'stock': return "border-orange-500 bg-orange-50 text-orange-600";
      default: return "border-blue-500 bg-blue-50 text-blue-600";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-muted/20 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button matching Edit Profile style */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-primary hover:underline mb-8 font-semibold text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
            <div className="space-y-1">
               <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
               <p className="text-muted-foreground text-sm">Stay updated with your orders and account alerts</p>
            </div>
            <div className="flex items-center gap-3">
               {unreadCount > 0 && (
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={markAllAsRead} 
                      className="h-10 rounded-full px-5 font-bold gap-2 hover:bg-primary/5 hover:text-primary border-dashed transition-all"
                  >
                      <CheckCheck className="w-4 h-4" />
                      Mark all read
                  </Button>
               )}
            </div>
          </div>

          {/* Main Content Card */}
          <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-background">
            <CardHeader className="bg-muted/5 border-b border-border/10 p-6 sm:p-8">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex p-1.5 bg-muted/40 rounded-full border border-border/40 w-full md:w-auto overflow-x-auto scrollbar-hide">
                      <Button
                          variant={filter === 'all' ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => { setFilter('all'); setPage(0); }}
                          className={cn("rounded-full h-9 text-xs font-bold px-5 transition-all text-white bg-[#003B95]", filter === 'all' && "shadow-sm shadow-black bg-primary")}
                      >
                          All
                      </Button>
                      <Button
                          variant={filter === 'unread' ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => { setFilter('unread'); setPage(0); }}
                          className={cn("rounded-full h-9 text-xs font-bold px-5 transition-all", filter === 'unread' && "shadow-sm")}
                      >
                          Unread {unreadCount > 0 && <span className="ml-1 opacity-70">({unreadCount})</span>}
                      </Button>
                      <Button
                          variant={filter === 'read' ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => { setFilter('read'); setPage(0); }}
                          className={cn("rounded-full h-9 text-xs font-bold px-5 transition-all", filter === 'read' && "shadow-sm")}
                      >
                          Read
                      </Button>
                  </div>
                  
                  <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                      <Input placeholder="Search alerts..." className="h-11 pl-10 rounded-full bg-muted/20 border-border/40 text-xs focus-visible:ring-primary/20 shadow-none" />
                  </div>
               </div>
            </CardHeader>

            <CardContent className="p-0 animate-in fade-in duration-500">
               {loading ? (
                  <div className="divide-y divide-border/5">
                      {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="p-6 sm:p-8 flex items-start gap-6 animate-pulse">
                              <div className="w-12 h-12 bg-muted/30 rounded-2xl shrink-0" />
                              <div className="flex-1 space-y-3">
                                  <div className="h-4 bg-muted/30 rounded-full w-1/3" />
                                  <div className="h-3 bg-muted/20 rounded-full w-2/3" />
                              </div>
                          </div>
                      ))}
                  </div>
               ) :
 notifications.length === 0 ? (
                  <div className="p-20 flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 bg-muted/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                          <Bell className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                      <h3 className="text-2xl font-black text-foreground/70 tracking-tight">Empty Inbox</h3>
                      <p className="text-muted-foreground mt-2 max-w-[200px] leading-relaxed">You don't have any notifications at the moment.</p>
                  </div>
               ) : (
                  <div className="divide-y divide-border/5">
                      {notifications.map((notification) => {
                          const typeStyles = getTypeStyles(notification.type);
                          const borderColor = typeStyles.split(' ')[0];
                          const iconBgColor = typeStyles.split(' ')[1];
                          const iconTextColor = typeStyles.split(' ')[2];

                          return (
                              <div 
                                  key={notification.id}
                                  onClick={() => {
                                      if (!notification.is_read) markAsRead(notification.id);
                                      if (notification.link) router.push(notification.link);
                                  }}
                                  className={cn(
                                      "group relative p-6 sm:p-8 flex items-start gap-4 sm:gap-6 transition-all duration-300 cursor-pointer border-l-[6px]",
                                      borderColor,
                                      !notification.is_read ? "bg-primary/[0.02] border-primary" : "border-transparent hover:bg-muted/30"
                                  )}
                              >
                                  <div className={cn(
                                      "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500",
                                      iconBgColor,
                                      iconTextColor
                                  )}>
                                      {getIcon(notification.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-4">
                                          <div className="space-y-0.5">
                                              <h4 className={cn(
                                                  "text-base font-bold transition-colors",
                                                  !notification.is_read ? "text-foreground" : "text-muted-foreground/80"
                                              )}>
                                                  {notification.title}
                                              </h4>
                                              <p className={cn(
                                                  "text-sm leading-relaxed max-w-2xl line-clamp-2",
                                                  !notification.is_read ? "text-foreground/70" : "text-muted-foreground/60"
                                              )}>
                                                  {notification.message}
                                              </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                               {!notification.is_read && <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse" />}
                                               <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      deleteNotification(notification.id);
                                                  }}
                                               >
                                                  <X className="h-4 w-4" />
                                               </Button>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4 mt-3">
                                          <span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                          </span>
                                          {notification.link && <Badge variant="secondary" className="rounded-full px-3 py-0 h-5 text-[9px] font-bold uppercase tracking-tighter">View Details</Badge>}
                                      </div>
                                  </div>
                                  {notification.link && <ChevronRight className="self-center h-5 w-5 text-muted-foreground/20 group-hover:translate-x-1 group-hover:text-primary transition-all" />}
                              </div>
                          );
                      })}
                  </div>
               )}
            </CardContent>

            {totalPages > 1 && (
              <div className="bg-muted/5 border-t border-border/10 p-6 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">Page {page + 1}/{totalPages}</p>
                  <div className="flex items-center gap-3">
                      <Button variant="ghost" className="h-10 rounded-full px-6 font-bold text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <Button variant="secondary" className="h-10 rounded-full px-6 font-bold text-xs shadow-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                  </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
