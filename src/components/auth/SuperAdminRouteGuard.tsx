import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuthUser } from '@/hooks/useAuthUser';

interface SuperAdminRouteGuardProps {
  children: ReactNode;
}

export const SuperAdminRouteGuard = ({ children }: SuperAdminRouteGuardProps) => {
  const { user, loading } = useAuthUser();
  const { isSuperAdmin, isLoadingSuperAdmin } = useSuperAdmin();

  if (loading || isLoadingSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};