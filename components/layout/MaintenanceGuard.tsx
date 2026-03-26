'use client';

import { ReactNode } from 'react';
import { useSettings } from '@/lib/hooks/use-settings';
import { useAuth } from '@/lib/context/auth-context';
import { Logo } from '@/components/ui/logo';
import { AlertTriangle, Hammer, Server, Timer } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface MaintenanceGuardProps {
  children: ReactNode;
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const { settings, isLoading } = useSettings();
  const { user } = useAuth();
  const pathname = usePathname();

  const isMaintenanceMode = settings?.system.maintenanceMode;
  const isAdmin = user?.role === 'admin';
  const isExcludedPath = pathname?.startsWith('/admin') || pathname?.startsWith('/login');

  // If maintenance mode is ON and user is NOT an admin, and path is NOT excluded, show maintenance page
  if (!isLoading && isMaintenanceMode && !isAdmin && !isExcludedPath) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center mb-8">
            <Logo variant="long" className="h-16 w-auto" />
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Hammer className="w-64 h-64 animate-bounce" />
            </div>
            
            <div className="relative space-y-4">
              <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl mb-4">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight">Under Maintenance</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                We're currently performing some scheduled updates to improve your experience.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="p-4 bg-secondary/20 rounded-xl border border-border">
              <Server className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">System Updates</p>
              <p className="text-xs text-muted-foreground mt-1">Upgrading our core infrastructure</p>
            </div>
            <div className="p-4 bg-secondary/20 rounded-xl border border-border">
              <Timer className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">Estimated Time</p>
              <p className="text-xs text-muted-foreground mt-1">We'll be back online shortly</p>
            </div>
          </div>

          <div className="pt-8 border-t border-border mt-12">
            <p className="text-sm text-muted-foreground italic">
              "Great things take time. Thank you for your patience."
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              &copy; {new Date().getFullYear()} {settings?.general.storeName || 'Never Stop Dreaming Trading'}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the actual children
  return <>{children}</>;
}
