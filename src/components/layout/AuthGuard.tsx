'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Spinner } from '@/components/ui';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);

      if (!authenticated && pathname !== '/login') {
        router.push('/login');
      } else if (authenticated && pathname === '/login') {
        router.push('/');
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100">
        <Spinner size="lg" />
      </div>
    );
  }

  // If on login page and not authenticated, show children (login form)
  if (pathname === '/login' && !isAuth) {
    return <>{children}</>;
  }

  // If authenticated, show children
  if (isAuth) {
    return <>{children}</>;
  }

  // Otherwise show nothing (redirecting)
  return null;
}
