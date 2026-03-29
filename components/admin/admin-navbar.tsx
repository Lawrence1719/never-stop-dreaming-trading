'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Moon, Sun, LogOut, User, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from '@/components/layout/notification-bell';

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
  const { toast } = useToast();

  // Improved error logger for various error shapes (Error, plain object, Response, etc.)
  const logError = (label: string, error: unknown) => {
    if (!error) {
      console.error(label, error);
      return;
    }

    if (error instanceof Error) {
      console.error(label, error.message, { stack: error.stack });
      return;
    }

    try {
      // Try to stringify plain objects (Supabase PostgrestError etc.)
      if (typeof error === 'object') {
        console.error(label, JSON.stringify(error));
        return;
      }
    } catch (e) {
      // Fallthrough to generic logging
    }

    // Fallback
    console.error(label, String(error));
  };

  const handleLogout = async (e?: React.MouseEvent | Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      console.log("Logging out...");
      // Clear user state and sign out from Supabase
      await logout();
      console.log("Logout successful");

      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
        variant: "success",
      });

      // Redirect to login page
      router.push('/login');
      router.refresh();

      // Ensure a clean state by forcing a hard redirect after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 300);
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
      // Even if there's an error, try to redirect
      router.push('/login');
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
          className="hover:bg-muted"
          title={sidebarOpen ? "Minimize Sidebar" : "Maximize Sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
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
        <NotificationBell targetRole="admin" />

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
              <Link href="/admin/profile" className="flex gap-2 w-full">
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
              onClick={(e) => {
                e.preventDefault();
                handleLogout(e);
              }}
              className="flex gap-2 text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
