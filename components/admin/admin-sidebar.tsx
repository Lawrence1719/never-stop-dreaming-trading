'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Zap, Settings, ChevronDown, FileText, MapPin, Gift, BookOpen, ChevronRight, Link2, Bell, Star, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { Logo } from '@/components/ui/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  submenu?: MenuItem[];
  badge?: number;
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Products',
    icon: Package,
    submenu: [
      { label: 'All Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/products/categories', icon: Tag },
      { label: 'Inventory', href: '/admin/inventory', icon: Zap },
      { label: 'Reviews', href: '/admin/products/reviews', icon: Star },
    ],
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    icon: Users,
    /* submenu: [
      { label: 'All Customers', href: '/admin/customers', icon: Users },
      { label: 'Groups', href: '/admin/customer-groups', icon: FileText },
    ], */
  },
  {
    label: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
  },
  /*{
    label: 'IoT & Tracking',
    icon: MapPin,
    submenu: [
      { label: 'Warehouse', href: '/admin/iot/warehouse', icon: Zap },
      { label: 'Live Tracking', href: '/admin/iot/tracking', icon: MapPin },
      { label: 'Alerts', href: '/admin/iot/alerts', icon: Zap },
      { label: 'Devices', href: '/admin/iot/devices', icon: Package },
    ],
  },*/
  {
    label: 'Reports',
    icon: BarChart3,
    submenu: [
      { label: 'Sales', href: '/admin/reports/sales', icon: BarChart3 },
      { label: 'Inventory', href: '/admin/reports/inventory', icon: Package },
      { label: 'Customers', href: '/admin/reports/customers', icon: Users },
    ],
  },
  {
    label: 'Marketing',
    icon: Gift,
    submenu: [
      { label: 'Banners', href: '/admin/marketing/banners', icon: FileText },
      { label: 'Coupons', href: '/admin/marketing/coupons', icon: Gift },
      { label: 'Newsletters', href: '/admin/marketing/newsletters', icon: FileText },
    ],
  },
  {
    label: 'CMS',
    icon: BookOpen,
    submenu: [
      { label: 'Pages', href: '/admin/cms/pages', icon: FileText },
      { label: 'FAQs', href: '/admin/cms/faqs', icon: BookOpen },
      { label: 'Testimonials', href: '/admin/cms/testimonials', icon: Users },
    ],
  },
  /* {
    label: 'Integration',
    href: '/admin/integration',
    icon: Link2,
  }, */
  {
    label: 'Settings',
    icon: Settings,
    submenu: [
      { label: 'General Settings', href: '/admin/settings', icon: Settings },
      { label: 'Staff Management', href: '/admin/settings/staff', icon: Users },
    ],
  },
];

function SidebarItem({
  item,
  isOpen,
  pathname,
}: {
  item: MenuItem;
  isOpen: boolean;
  pathname: string;
}) {
  const Icon = item.icon;
  const hasSubmenu = !!item.submenu;

  const isActive = item.href && pathname === item.href;
  const isSubmenuActive = item.submenu?.some((sub) => pathname === sub.href);
  const [expanded, setExpanded] = useState(Boolean(isSubmenuActive));

  useEffect(() => {
    if (isSubmenuActive) {
      setExpanded(true);
    }
  }, [isSubmenuActive]);

  if (hasSubmenu && !isOpen) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors hover:bg-muted',
              isSubmenuActive ? 'bg-primary/10 text-primary' : ''
            )}
            title={item.label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="destructive" className="absolute top-1 right-1 h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center">
                {item.badge}
              </Badge>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48 ml-2">
          <DropdownMenuLabel className="font-bold">{item.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.submenu!.map((subitem) => (
            <DropdownMenuItem key={subitem.href} asChild>
              <Link
                href={subitem.href!}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  pathname === subitem.href ? 'text-primary font-medium' : ''
                )}
              >
                <subitem.icon className="h-4 w-4" />
                <span>{subitem.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      {hasSubmenu ? (
        <button
          onClick={() => setExpanded(!expanded)}
          title={!isOpen ? item.label : undefined}
          className={cn(
            'w-full px-3 py-2 rounded-md text-sm font-medium flex items-center justify-between transition-colors',
            isSubmenuActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            {isOpen && <span>{item.label}</span>}
          </div>
          <div className="flex items-center gap-1">
            {isOpen && item.badge !== undefined && item.badge > 0 && (
              <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center">
                {item.badge}
              </Badge>
            )}
            {isOpen && (
              <ChevronRight
                className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
              />
            )}
          </div>
        </button>
      ) : (
        <Link href={item.href!} title={!isOpen ? item.label : undefined}>
          <div
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors relative',
              !isOpen ? 'justify-center' : 'justify-between',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </div>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge 
                variant={isActive ? "outline" : "destructive"} 
                className={cn(
                  "h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center font-bold border-none", 
                  isActive && "!bg-white !text-black",
                  !isOpen && "absolute top-1 right-1"
                )}
              >
                {item.badge}
              </Badge>
            )}
          </div>
        </Link>
      )}

      {hasSubmenu && expanded && isOpen && (
        <div className="ml-4 mt-2 space-y-1 border-l border-muted-foreground/20 pl-2">
          {item.submenu!.map((subitem) => (
            <Link key={subitem.href} href={subitem.href!}>
              <div
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors',
                  pathname === subitem.href
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <subitem.icon className="h-3 w-3" />
                <span>{subitem.label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications('admin');


  const updatedMenuItems = menuItems.map(item => {
    if (item.label === 'Notifications') {
      return { ...item, badge: unreadCount };
    }
    return item;
  });

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'bg-card border-r border-border transition-all duration-300 z-50 flex flex-col',
          'fixed inset-y-0 left-0 md:relative',
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-20',
        )}
      >
        <div className={cn(
          "border-b border-border flex px-4 transition-all duration-300",
          isOpen ? "h-24 items-center justify-center" : "h-16 items-center justify-center"
        )}>
          <Link
            href="/admin/dashboard"
            className={cn(
              "overflow-hidden",
              isOpen ? "flex flex-col items-center justify-center text-center" : "flex items-center justify-center"
            )}
          >
            <Logo variant="square" className="h-10 w-10 shrink-0" />
            {isOpen && (
              <span className="mt-2 font-bold text-lg whitespace-nowrap opacity-100 transition-opacity duration-300 delay-100">
                Admin Panel
              </span>
            )}
          </Link>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {updatedMenuItems.map((item, idx) => (
              <SidebarItem
                key={idx}
                item={item}
                isOpen={isOpen}
                pathname={pathname}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {isOpen && <p>v1.0.0</p>}
        </div>
      </aside>
    </>
  );
}
