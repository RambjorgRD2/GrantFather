import React from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SuperAdminGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
  showError?: boolean;
}

export function SuperAdminGuard({
  children,
  fallbackPath = '/applications',
  showError = false,
}: SuperAdminGuardProps) {
  const { isSuperAdmin, isLoading, error } = useSuperAdmin();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Verifying SuperAdmin access...
        </p>
      </div>
    );
  }

  // Show error state if requested
  if (error && showError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to verify SuperAdmin status. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect if not superadmin
  if (!isSuperAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Render children if superadmin
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-primary">
          SuperAdmin Access Granted
        </span>
      </div>
      {children}
    </div>
  );
}
