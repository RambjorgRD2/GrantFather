import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface LazyLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  showErrorDetails?: boolean;
}

interface LazyComponentProps {
  component: ComponentType<any>;
  props?: any;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

// Default loading fallback
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Default error fallback
const DefaultErrorFallback = () => (
  <Card className="border-destructive/50">
    <CardContent className="flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-sm text-muted-foreground">Failed to load content</p>
      </div>
    </CardContent>
  </Card>
);

// Main LazyLoader component
export function LazyLoader({
  children,
  fallback = <DefaultLoadingFallback />,
  errorFallback = <DefaultErrorFallback />,
  showErrorDetails = false,
}: LazyLoaderProps) {
  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={(error, errorInfo) => {
        if (showErrorDetails) {
          console.error('LazyLoader error:', error, errorInfo);
        }
      }}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// Lazy component wrapper with error boundary
export function LazyComponent({
  component: Component,
  props = {},
  fallback = <DefaultLoadingFallback />,
  errorFallback = <DefaultErrorFallback />,
}: LazyComponentProps) {
  return (
    <LazyLoader fallback={fallback} errorFallback={errorFallback}>
      <Component {...props} />
    </LazyLoader>
  );
}

// Skeleton loading components for different content types
export const SkeletonLoader = {
  // Card skeleton
  Card: () => (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  ),

  // Table skeleton
  Table: ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-20" />
          ))}
        </div>
      ))}
    </div>
  ),

  // List skeleton
  List: ({ items = 3 }: { items?: number }) => (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ),

  // Form skeleton
  Form: ({ fields = 4 }: { fields?: number }) => (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  ),
};

// Utility function to create lazy components with consistent loading states
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <LazyLoader fallback={fallback}>
        <LazyComponent {...props} />
      </LazyLoader>
    );
  };
}

// Preload utility for better user experience
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return () => {
    // Start loading the component in the background
    importFunc();
  };
}

// Intersection Observer hook for lazy loading based on visibility
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasIntersected) {
        setIsIntersecting(true);
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
}
