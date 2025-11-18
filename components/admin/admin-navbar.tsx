'use client';

import { useState } from 'react';
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

export default function AdminNavbar({
  onSidebarToggle,
  sidebarOpen,
}: {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(3);

  const handleLogout = () => {
    localStorage.removeItem('mockUser');
    router.push('/login');
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
              {notifications > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-3 font-semibold text-sm">Notifications</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="text-sm">
                <p className="font-medium">New order #1024</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="text-sm">
                <p className="font-medium">Low stock alert</p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="text-sm">
                <p className="font-medium">Customer review pending</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </DropdownMenuItem>
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
            <Button variant="ghost" size="icon">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                A
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
