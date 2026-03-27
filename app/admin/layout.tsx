'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/admin-sidebar';
import AdminNavbar from '@/components/admin/admin-navbar';
import { useAuth } from '@/lib/context/auth-context';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Redirect non-admin users away from admin pages
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingScreen message="One Moment" subMessage="Preparing your dashboard..." />;
  }

  // Don't render admin layout if user is not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
