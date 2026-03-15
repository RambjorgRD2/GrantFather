import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, AlertCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UnifiedRouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireOrganization?: boolean;
  requireOnboarding?: boolean;
  fallbackRoute?: string;
  loadingComponent?: ReactNode;
  autoRedirect?: boolean;
}

export function UnifiedRouteGuard({
  children,
  requireAuth = true,
  requireOrganization = false,
  requireOnboarding = false,
  fallbackRoute,
  loadingComponent,
  autoRedirect = true,
}: UnifiedRouteGuardProps) {
  const {
    user,
    loading,
    authChecked,
    orgLoading,
    hasOrganization,
    needsOnboarding,
    authError,
    refetchOrganization,
    clearAuthError,
  } = useAuth();
  const navigate = useNavigate();

  // Always call useEffect to ensure consistent hook usage
  useEffect(() => {
    // Wait until auth is checked and any org loading is complete
    if (!autoRedirect || loading || !authChecked || orgLoading) return;

    // Authentication required but user not authenticated
    if (requireAuth && !user) {
      const redirectTo = fallbackRoute || '/login';
      console.log(`Redirecting unauthenticated user to: ${redirectTo}`);
      navigate(redirectTo, { replace: true });
      return;
    }

    // Organization required but user has no organization
    if (requireOrganization && !hasOrganization) {
      const redirectTo = fallbackRoute || '/onboarding';
      console.log(`Redirecting user without organization to: ${redirectTo}`);
      navigate(redirectTo, { replace: true });
      return;
    }

    // Onboarding required but user hasn't completed it
    if (requireOnboarding && needsOnboarding) {
      const redirectTo = fallbackRoute || '/onboarding';
      console.log(`Redirecting user needing onboarding to: ${redirectTo}`);
      navigate(redirectTo, { replace: true });
      return;
    }
  }, [
    user,
    loading,
    authChecked,
    orgLoading,
    hasOrganization,
    needsOnboarding,
    requireAuth,
    requireOrganization,
    requireOnboarding,
    fallbackRoute,
    autoRedirect,
    navigate,
  ]);

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className="container py-10">
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Error recovery UI for auth/org fetch errors
  if (authChecked && !loading && authError) {
    return (
      <div className="container py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>We couldn’t verify your access</CardTitle>
            <CardDescription>
              {authError.message ||
                'An unexpected error occurred. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => refetchOrganization()}>
              Retry
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => clearAuthError()}
            >
              Dismiss
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle automatic redirects
  if (autoRedirect) {
    // Authentication required but user not authenticated
    if (requireAuth && !user) {
      return (
        <div className="container py-10">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Redirecting to login...</span>
            </div>
          </div>
        </div>
      );
    }

    // Organization required but user has no organization
    if (requireOrganization && !hasOrganization) {
      return (
        <div className="container py-10">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Redirecting to organization setup...</span>
            </div>
          </div>
        </div>
      );
    }

    // Onboarding required but user hasn't completed it
    if (requireOnboarding && needsOnboarding) {
      return (
        <div className="container py-10">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Redirecting to onboarding...</span>
            </div>
          </div>
        </div>
      );
    }
  }

  // Manual redirect handling (when autoRedirect is false)
  if (!autoRedirect) {
    // Authentication required but user not authenticated
    if (requireAuth && !user) {
      if (fallbackRoute) {
        navigate(fallbackRoute, { replace: true });
        return null;
      }

      return (
        <div className="container py-10">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                You must be logged in to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Organization required but user has no organization
    if (requireOrganization && !hasOrganization) {
      if (fallbackRoute) {
        navigate(fallbackRoute, { replace: true });
        return null;
      }

      return (
        <div className="container py-10">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Organization Required</CardTitle>
              <CardDescription>
                You need to create or join an organization to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => navigate('/onboarding')}
                className="w-full"
              >
                Create Organization
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Onboarding required but user hasn't completed it
    if (requireOnboarding && needsOnboarding) {
      if (fallbackRoute) {
        navigate(fallbackRoute, { replace: true });
        return null;
      }

      return (
        <div className="container py-10">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Onboarding Required</CardTitle>
              <CardDescription>
                Please complete your organization setup to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => navigate('/onboarding')}
                className="w-full"
              >
                Complete Onboarding
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // All requirements met, render children
  return <>{children}</>;
}

// Convenience components for common use cases
export function AuthRequired({
  children,
  ...props
}: Omit<UnifiedRouteGuardProps, 'requireAuth'>) {
  return (
    <UnifiedRouteGuard requireAuth={true} {...props}>
      {children}
    </UnifiedRouteGuard>
  );
}

export function OrganizationRequired({
  children,
  ...props
}: Omit<UnifiedRouteGuardProps, 'requireOrganization'>) {
  return (
    <UnifiedRouteGuard requireAuth={true} requireOrganization={true} {...props}>
      {children}
    </UnifiedRouteGuard>
  );
}

export function OnboardingRequired({
  children,
  ...props
}: Omit<UnifiedRouteGuardProps, 'requireOnboarding'>) {
  return (
    <UnifiedRouteGuard
      requireAuth={true}
      requireOrganization={true}
      requireOnboarding={true}
      {...props}
    >
      {children}
    </UnifiedRouteGuard>
  );
}
