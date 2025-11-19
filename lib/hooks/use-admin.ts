import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook for admin pages to access admin user information
 * Automatically redirects if user is not an admin
 */
export function useAdmin() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  return {
    user,
    isLoading,
    isAdmin: user?.role === 'admin',
  };
}

