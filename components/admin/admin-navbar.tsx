'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Moon, Sun, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/context/auth-context';
import { useToast, ToastContainer } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase/client';
import { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function AdminNavbar({
  onSidebarToggle,
  sidebarOpen,
}: {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const handleLogout = async (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log("Logging out...");
      await logout();
      console.log("Logout successful");
      addToast("Logged out successfully", "success");
      // Redirect immediately after logout
      setTimeout(() => {
        router.push('/login');
        router.refresh();
      }, 300);
    } catch (error) {
      console.error("Logout error:", error);
      addToast("Failed to logout. Please try again.", "error");
    }
  };

  // Fetch notifications from Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        // If user is admin, fetch all notifications, otherwise fetch only user's notifications
        const query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (user.role === 'admin') {
          // Admins can see all notifications
          const { data, error } = await query;
          if (error) throw error;
          setNotifications(data || []);
        } else {
          // Regular users see only their notifications
          const { data, error } = await query.eq('user_id', user.id);
          if (error) throw error;
          setNotifications(data || []);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to empty array on error
        setNotifications([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: user.role === 'admin' ? undefined : `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const notificationIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (notificationIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds);

      if (error) throw error;

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  // Get notification icon color based on type
  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'order':
        return 'text-blue-600';
      case 'stock':
        return 'text-orange-600';
      default:
        return 'text-muted-foreground';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'A';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <nav className="bg-card border-b border-border h-16 flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden md:flex items-center flex-1 max-w-xs">
          <Input
            placeholder="Search..."
            className="bg-muted border-muted-foreground/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="font-semibold text-sm">Notifications</div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                  className="text-xs h-6 px-2"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            {isLoadingNotifications ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      if (notification.link) {
                        router.push(notification.link);
                      }
                    }}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                      !notification.read ? 'bg-secondary/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !notification.read ? 'bg-primary' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            !notification.read ? 'font-semibold' : ''
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {notifications.length >= 10 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/notifications" className="w-full text-center text-sm">
                        View all notifications
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {getUserInitials()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 border-b border-border">
              <p className="text-sm font-medium">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
              <p className="text-xs text-muted-foreground mt-1">Role: {user?.role || 'admin'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex gap-2 w-full">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="flex gap-2 w-full">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                handleLogout(e as any);
              }} 
              className="flex gap-2 text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </nav>
  );
}
