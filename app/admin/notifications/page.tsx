"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  Bell, 
  Send, 
  History, 
  User, 
  Users, 
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
  Search,
  ArrowRight,
  TrendingUp,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeView, setActiveView] = useState<"logs" | "send">("logs");
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  
  // History/View State
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const PAGE_SIZE = 10;

  const { 
    notifications, 
    unreadCount, 
    totalCount,
    loading: historyLoading,
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    refresh
  } = useNotifications('admin', { 
    page, 
    limit: PAGE_SIZE, 
    filter 
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Send Form State
  const [sendLoading, setSendLoading] = useState(false);
  const [targetType, setTargetType] = useState<"individual" | "broadcast">("individual");
  const [targetRole, setTargetRole] = useState<"customer" | "admin">("customer");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<any>("info");
  const [link, setLink] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .order('name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetType === 'individual' && !selectedUserId) {
      toast({ title: "Error", description: "Please select a user", variant: "destructive" });
      return;
    }
    if (!title || !message) {
      toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
      return;
    }

    setSendLoading(true);
    try {
      let finalTargetIds: string[] = [];

      if (targetType === 'broadcast') {
        finalTargetIds = users
          .filter(u => u.role === targetRole)
          .map(u => u.id);
      } else {
        if (selectedUserId.includes('@')) {
          const { data: profile, error: searchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', selectedUserId)
            .single();

          if (searchError || !profile) {
            toast({ title: "User not found", description: `Could not find a user with email ${selectedUserId}`, variant: "destructive" });
            setSendLoading(false);
            return;
          }
          finalTargetIds = [profile.id];
        } else {
          finalTargetIds = [selectedUserId];
        }
      }

      const notificationsToInsert = finalTargetIds.map(uid => ({
        user_id: uid,
        title,
        message,
        type,
        link: link || null,
        is_read: false,
        target_role: targetRole,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Sent ${notificationsToInsert.length} notification(s)`,
        variant: "success",
      });

      // Clear form
      setTitle("");
      setMessage("");
      setLink("");
      refresh();
    } catch (err) {
      console.error('Error sending notification:', err);
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    } finally {
      setSendLoading(false);
    }
  };

  const stats = useMemo(() => [
    {
      title: 'Total Alerts',
      value: totalCount.toLocaleString(),
      sub: 'Lifetime logs',
      icon: Bell,
      color: 'text-muted-foreground'
    },
    {
      title: 'Unread Alerts',
      value: unreadCount.toLocaleString(),
      sub: 'Awaiting review',
      icon: AlertCircle,
      color: 'text-primary'
    },
    {
      title: 'Warnings',
      value: notifications.filter(n => n.type === 'warning' || n.type === 'error').length.toLocaleString(),
      sub: 'Critical events',
      icon: AlertTriangle,
      color: 'text-amber-600'
    },
    {
      title: 'Stock Alerts',
      value: notifications.filter(n => n.type === 'stock').length.toLocaleString(),
      sub: 'Inventory status',
      icon: ShoppingBag,
      color: 'text-blue-600'
    }
  ], [totalCount, unreadCount, notifications]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all system alerts and manual broadcasts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'logs' ? 'default' : 'outline'}
            onClick={() => setActiveView('logs')}
            className="h-10 px-6 font-semibold"
          >
            Alert Logs
          </Button>
          <Button
            variant={activeView === 'send' ? 'default' : 'outline'}
            onClick={() => setActiveView('send')}
            className="h-10 px-6 font-semibold"
          >
            Manual Dispatch
          </Button>
        </div>
      </div>

      {/* Stats Grid - Exactly like Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeView === 'logs' ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Notification History</CardTitle>
                <CardDescription>Recent alerts and automated system notifications</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filter} onValueChange={(v:any) => { setFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="All Alerts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Alerts</SelectItem>
                    <SelectItem value="unread">Unread Only</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
                  </SelectContent>
                </Select>
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-9">
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`loading-${idx}`} className="animate-pulse">
                      <TableCell colSpan={5}><div className="h-4 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No notifications found for the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow 
                      key={notification.id}
                      className={cn("cursor-pointer", !notification.is_read && "bg-primary/[0.02]")}
                      onClick={() => {
                        if (!notification.is_read) markAsRead(notification.id);
                        if (notification.link) router.push(notification.link);
                      }}
                    >
                      <TableCell>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          notification.type === 'success' ? "bg-green-100 text-green-600" :
                          notification.type === 'warning' || notification.type === 'error' ? "bg-red-100 text-red-600" :
                          notification.type === 'stock' ? "bg-amber-100 text-amber-600" :
                          "bg-blue-100 text-blue-600"
                        )}>
                          {notification.type === 'success' ? <Check className="w-4 h-4" /> :
                           notification.type === 'warning' || notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                           notification.type === 'stock' ? <BarChart3 className="w-4 h-4" /> :
                           <Info className="w-4 h-4" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={cn("font-medium", !notification.is_read ? "text-foreground" : "text-muted-foreground")}>
                            {notification.title}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{notification.message}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={notification.is_read ? 'outline' : 'default'} className="rounded-full">
                          {notification.is_read ? 'Read' : 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6">
                <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Manual Notification Dispatch</CardTitle>
            <CardDescription>Send a targeted or broadcast notification to users.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Delivery Mode</Label>
                    <div className="flex p-0.5 bg-muted/30 rounded-md gap-0.5">
                      <Button
                        type="button"
                        variant={targetType === 'individual' ? 'secondary' : 'ghost'}
                        className="flex-1 rounded-sm h-8 text-[11px] font-bold"
                        onClick={() => setTargetType('individual')}
                      >
                        Individual
                      </Button>
                      <Button
                        type="button"
                        variant={targetType === 'broadcast' ? 'secondary' : 'ghost'}
                        className="flex-1 rounded-sm h-8 text-[11px] font-bold"
                        onClick={() => setTargetType('broadcast')}
                      >
                        Broadcast
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">User Role</Label>
                    <Select value={targetRole} onValueChange={(v:any) => setTargetRole(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customers</SelectItem>
                        <SelectItem value="admin">Administrators</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {targetType === 'individual' && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Recipient</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Search users..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {users
                            .filter(u => u.role === targetRole)
                            .map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                <div className="flex flex-col text-left">
                                  <span className="font-bold text-[11px] truncate max-w-[200px]">{u.name}</span>
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">{u.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="pt-1 text-[9px] text-muted-foreground/40 text-center font-bold tracking-widest uppercase">- OR -</div>
                      <Input 
                        placeholder="Direct Email or UUID entry"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Alert Details</Label>
                    <Input 
                      placeholder="Title (e.g. Order Update)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9"
                    />
                    <textarea 
                      className="w-full min-h-[90px] rounded-md border border-input bg-transparent px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all leading-relaxed"
                      placeholder="Enter the notification content..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Theme</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info (Blue)</SelectItem>
                          <SelectItem value="success">Success (Green)</SelectItem>
                          <SelectItem value="warning">Warning (Amber)</SelectItem>
                          <SelectItem value="error">Critical (Red)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">URL (Optional)</Label>
                      <Input 
                        placeholder="/shop"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t font-semibold">
                <Button 
                  type="submit" 
                  disabled={sendLoading}
                  className="px-10 h-10 text-xs gap-2"
                >
                  {sendLoading ? "Dispatching..." : "Send Notification"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Re-using some components from Dashboard if they were available, 
// manually implementing them here to ensure exact look.
const BarChart3 = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);
