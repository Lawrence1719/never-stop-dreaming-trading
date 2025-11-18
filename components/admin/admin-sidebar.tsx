'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Zap, Settings, ChevronDown, FileText, MapPin, Gift, BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  submenu?: MenuItem[];
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
      { label: 'Categories', href: '/admin/categories', icon: FileText },
      { label: 'Inventory', href: '/admin/inventory', icon: Zap },
    ],
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Customers',
    icon: Users,
    submenu: [
      { label: 'All Customers', href: '/admin/customers', icon: Users },
      { label: 'Groups', href: '/admin/customer-groups', icon: FileText },
    ],
  },
  {
    label: 'IoT & Tracking',
    icon: MapPin,
    submenu: [
      { label: 'Warehouse', href: '/admin/iot/warehouse', icon: Zap },
      { label: 'Live Tracking', href: '/admin/iot/tracking', icon: MapPin },
      { label: 'Alerts', href: '/admin/iot/alerts', icon: Zap },
      { label: 'Devices', href: '/admin/iot/devices', icon: Package },
    ],
  },
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
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
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
  const [expanded, setExpanded] = useState(false);
  const Icon = item.icon;
  const hasSubmenu = !!item.submenu;

  const isActive = item.href && pathname === item.href;
  const isSubmenuActive = item.submenu?.some((sub) => pathname === sub.href);

  return (
    <div>
      {hasSubmenu ? (
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full px-3 py-2 rounded-md text-sm font-medium flex items-center justify-between transition-colors',
            isSubmenuActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {isOpen && <span>{item.label}</span>}
          </div>
          {isOpen && (
            <ChevronRight
              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
            />
          )}
        </button>
      ) : (
        <Link href={item.href!}>
          <div
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            {isOpen && <span>{item.label}</span>}
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

export default function AdminSidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'bg-card border-r border-border transition-all duration-300 hidden md:flex flex-col',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="h-16 border-b border-border flex items-center justify-center px-4">
        <Link href="/admin/dashboard" className="font-bold text-lg">
          {isOpen ? 'Admin Panel' : 'AP'}
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {menuItems.map((item, idx) => (
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
  );
}
