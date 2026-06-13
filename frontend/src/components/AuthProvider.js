'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

export default function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = isLoggedIn();
      
      // If not logged in and not on homepage, redirect to homepage
      if (!loggedIn && pathname !== '/') {
        router.push('/');
      }
    };

    // Check immediately
    checkAuth();

    // Check on every route change
    const handleRouteChange = () => {
      setTimeout(checkAuth, 100); // Small delay to ensure page loads
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [pathname, router]);

  return <>{children}</>;
}