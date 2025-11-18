'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/admin-sidebar';
import AdminNavbar from '@/components/admin/admin-navbar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);


  return (
    <div className="flex h-screen bg-background text-foreground">
      <AdminSidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminNavbar onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
