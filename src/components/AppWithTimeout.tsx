import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';

interface AppWithTimeoutProps {
  children: React.ReactNode;
}

export function AppWithTimeout({ children }: AppWithTimeoutProps) {
  const [forceRefresh, setForceRefresh] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Cache-busting navigation utility
  const navigateWithCacheBusting = (path: string) => {
    const timestamp = Date.now();
    const url = `${path}${path.includes('?') ? '&' : '?'}_nocache=${timestamp}`;
    window.location.href = url;
  };

  // Clear auth-related caches if stuck on auth routes
  useEffect(() => {
    const authRoutes = ['/login', '/register', '/auth/callback'];
    const isAuthRoute = authRoutes.some(route => location.pathname.startsWith(route));
    
    if (isAuthRoute) {
      // Clear any stale auth data from localStorage
      const staleKeys = ['supabase.auth.token', 'authRetryCount', 'lastAuthAttempt'];
      staleKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          logger.debug('Failed to clear localStorage key:', key);
        }
      });
    }
  }, [location.pathname]);

  // Force refresh mechanism for persistent issues
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'forceAppRefresh' && e.newValue === 'true') {
        setForceRefresh(true);
        localStorage.removeItem('forceAppRefresh');
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (forceRefresh) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Refreshing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}