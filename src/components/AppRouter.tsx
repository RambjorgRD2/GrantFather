import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UnifiedRouteGuard } from '@/components/auth/UnifiedRouteGuard';
import { SuperAdminRouteGuard } from './auth/SuperAdminRouteGuard';
import { AppLayout } from '@/components/layout/AppLayout';

const Index = lazy(() => import('@/pages/Index'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));
const Applications = lazy(() => import('@/pages/Applications'));
const Grants = lazy(() => import('@/pages/Grants'));
const Help = lazy(() => import('@/pages/Help'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AcceptInvitation = lazy(() => import('@/pages/AcceptInvitation'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const OrganizationSettings = lazy(() => import('@/pages/OrganizationSettings'));
const GrantDraft = lazy(() => import('@/pages/GrantDraft'));
const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
const Organizations = lazy(() => import('@/pages/Organizations'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function AppRouter() {
  const { loading, authChecked, user, hasOrganization, needsOnboarding } =
    useAuth();
  const location = useLocation();

  const isProtectedPath = React.useMemo(() => {
    const p = location.pathname;
    return (
      p.startsWith('/dashboard') ||
      p.startsWith('/grants') ||
      p.startsWith('/applications') ||
      p.startsWith('/settings') ||
      p.startsWith('/apply') ||
      p.startsWith('/superadmin')
    );
  }, [location.pathname]);

  // Show loading spinner only during initial auth check
  if (isProtectedPath && (!authChecked || loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirects are handled centrally in UnifiedRouteGuard

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/help" element={<Help />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Protected routes that require authentication */}
      <Route
        path="/accept-invitation"
        element={
          <ProtectedRoute>
            <AcceptInvitation />
          </ProtectedRoute>
        }
      />

      {/* Routes that require authentication but not onboarding */}
      <Route
        path="/onboarding"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={false}>
            <Onboarding />
          </UnifiedRouteGuard>
        }
      />

      {/* Redirect /app to /dashboard for consistency */}
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />

      {/* Routes that require both authentication and onboarding */}
      <Route
        path="/dashboard"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </UnifiedRouteGuard>
        }
      />
      <Route
        path="/grants"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
            <AppLayout>
              <Grants />
            </AppLayout>
          </UnifiedRouteGuard>
        }
      />
      <Route
        path="/applications"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
            <AppLayout>
              <Applications />
            </AppLayout>
          </UnifiedRouteGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
            <AppLayout>
              <OrganizationSettings />
            </AppLayout>
          </UnifiedRouteGuard>
        }
      />
      <Route
        path="/organizations"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
            <AppLayout>
              <Organizations />
            </AppLayout>
          </UnifiedRouteGuard>
        }
      />
      <Route
        path="/apply/draft/:id"
        element={
          <UnifiedRouteGuard requireAuth={true} requireOnboarding={true}>
            <AppLayout>
              <GrantDraft />
            </AppLayout>
          </UnifiedRouteGuard>
        }
      />

      {/* SuperAdmin routes */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminRouteGuard>
            <AppLayout>
              <SuperAdmin />
            </AppLayout>
          </SuperAdminRouteGuard>
        }
      />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
