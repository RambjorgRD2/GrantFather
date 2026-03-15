import React, {
  memo,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { useComponentPerformance } from '@/hooks/usePerformance';
import { ErrorBoundary } from './ErrorBoundary';

interface OptimizedComponentProps {
  children: React.ReactNode;
  componentName?: string;
  memoize?: boolean;
  errorBoundary?: boolean;
  performanceTracking?: boolean;
  intersectionObserver?: boolean;
  lazyLoad?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface WithOptimizationOptions {
  memoize?: boolean;
  errorBoundary?: boolean;
  performanceTracking?: boolean;
  displayName?: string;
}

// Base optimized component
export const OptimizedComponent = forwardRef<
  HTMLDivElement,
  OptimizedComponentProps
>(
  (
    {
      children,
      componentName = 'OptimizedComponent',
      memoize = true,
      errorBoundary = true,
      performanceTracking = true,
      intersectionObserver = false,
      lazyLoad = false,
      className = '',
      style,
      onClick,
      onMouseEnter,
      onMouseLeave,
    },
    ref
  ) => {
    // Performance tracking
    const performance = useComponentPerformance(componentName);

    // Intersection observer for lazy loading
    const [isVisible, setIsVisible] = React.useState(!lazyLoad);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!intersectionObserver || !lazyLoad) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [intersectionObserver, lazyLoad]);

    // Memoized event handlers
    const handleClick = useCallback(() => {
      onClick?.();
    }, [onClick]);

    const handleMouseEnter = useCallback(() => {
      onMouseEnter?.();
    }, [onMouseEnter]);

    const handleMouseLeave = useCallback(() => {
      onMouseLeave?.();
    }, [onMouseLeave]);

    // Memoized styles
    const memoizedStyle = useMemo(() => style, [style]);

    // Don't render if lazy loading and not visible
    if (lazyLoad && !isVisible) {
      return (
        <div
          ref={elementRef}
          className={`${className} opacity-0 transition-opacity duration-300`.trim()}
          style={memoizedStyle}
        />
      );
    }

    const content = (
      <div
        ref={ref || elementRef}
        className={`${className} ${lazyLoad ? 'opacity-100' : ''}`.trim()}
        style={memoizedStyle}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-component-name={componentName}
        data-performance-tracking={performanceTracking}
      >
        {children}
      </div>
    );

    // Wrap with error boundary if enabled
    if (errorBoundary) {
      return (
        <ErrorBoundary
          fallback={
            <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
              <p className="text-sm text-destructive">
                Error in {componentName}. Please refresh the page.
              </p>
            </div>
          }
        >
          {content}
        </ErrorBoundary>
      );
    }

    return content;
  }
);

OptimizedComponent.displayName = 'OptimizedComponent';

// HOC for adding optimization to existing components
export function withOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: WithOptimizationOptions = {}
) {
  const {
    memoize = true,
    errorBoundary = true,
    performanceTracking = true,
    displayName,
  } = options;

  let OptimizedComponent = Component;

  // Add memoization
  if (memoize) {
    OptimizedComponent = React.memo(Component) as React.ComponentType<P>;
  }

  // Add error boundary
  if (errorBoundary) {
    const WithErrorBoundary = (props: P) => (
      <ErrorBoundary
        fallback={
          <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
            <p className="text-sm text-destructive">
              Error in {displayName || Component.displayName || Component.name}.
              Please refresh the page.
            </p>
          </div>
        }
      >
        <Component {...props} />
      </ErrorBoundary>
    );

    WithErrorBoundary.displayName = `withErrorBoundary(${
      displayName || Component.displayName || Component.name
    })`;
    OptimizedComponent = WithErrorBoundary as React.ComponentType<P>;
  }

  // Add performance tracking
  if (performanceTracking) {
    const WithPerformanceTracking = (props: P) => {
      useComponentPerformance(
        displayName || Component.displayName || Component.name
      );
      return <Component {...props} />;
    };

    WithPerformanceTracking.displayName = `withPerformanceTracking(${
      displayName || Component.displayName || Component.name
    })`;
    OptimizedComponent = WithPerformanceTracking as React.ComponentType<P>;
  }

  return OptimizedComponent;
}

// Specialized optimized components
export const OptimizedCard = withOptimization(
  ({ children, className = '', ...props }: React.ComponentProps<'div'>) => (
    <div
      className={`bg-card text-card-foreground rounded-lg border shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  ),
  { displayName: 'OptimizedCard' }
);

export const OptimizedButton = withOptimization(
  ({ children, className = '', ...props }: React.ComponentProps<'button'>) => (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
  { displayName: 'OptimizedButton' }
);

export const OptimizedInput = withOptimization(
  ({ className = '', ...props }: React.ComponentProps<'input'>) => (
    <input
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  ),
  { displayName: 'OptimizedInput' }
);

// Performance monitoring wrapper
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WithPerformanceMonitoring = (props: P) => {
    useComponentPerformance(
      componentName || Component.displayName || Component.name
    );
    return <Component {...props} />;
  };

  WithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${
    componentName || Component.displayName || Component.name
  })`;
  return WithPerformanceMonitoring;
}

// Lazy loading wrapper
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const WithLazyLoading = (props: P) => {
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
      setIsLoaded(true);
    }, []);

    if (!isLoaded) {
      return (
        fallback || (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )
      );
    }

    return <Component {...props} />;
  };

  WithLazyLoading.displayName = `withLazyLoading(${
    Component.displayName || Component.name
  })`;
  return WithLazyLoading;
}

// Intersection observer wrapper
export function withIntersectionObserver<P extends object>(
  Component: React.ComponentType<P>,
  options: IntersectionObserverInit = {}
) {
  const WithIntersectionObserver = (props: P) => {
    const [isIntersecting, setIsIntersecting] = React.useState(false);
    const elementRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      }, options);

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [options]);

    return (
      <div ref={elementRef}>{isIntersecting && <Component {...props} />}</div>
    );
  };

  WithIntersectionObserver.displayName = `withIntersectionObserver(${
    Component.displayName || Component.name
  })`;
  return WithIntersectionObserver;
}
