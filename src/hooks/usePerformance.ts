import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  timeToFirstByte: number;
  timeToInteractive: number;
  bundleSize: number;
  renderTime: number;
}

interface UsePerformanceOptions {
  trackRenderTime?: boolean;
  trackBundleSize?: boolean;
  onMetricsUpdate?: (metrics: Partial<PerformanceMetrics>) => void;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const renderStartTime = useRef<number>(0);
  const metrics = useRef<Partial<PerformanceMetrics>>({});

  // Track render performance
  const trackRender = useCallback(() => {
    if (options.trackRenderTime) {
      renderStartTime.current = performance.now();
    }
  }, [options.trackRenderTime]);

  const endRender = useCallback(() => {
    if (options.trackRenderTime && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      metrics.current.renderTime = renderTime;
      
      if (renderTime > 16) { // 60fps threshold
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
      
      options.onMetricsUpdate?.({ renderTime });
    }
  }, [options.trackRenderTime, options.onMetricsUpdate]);

  // Track bundle size
  const trackBundleSize = useCallback(() => {
    if (options.trackBundleSize && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const timeToFirstByte = navigation.responseStart - navigation.requestStart;
        const timeToInteractive = navigation.domInteractive - navigation.fetchStart;
        
        metrics.current.timeToFirstByte = timeToFirstByte;
        metrics.current.timeToInteractive = timeToInteractive;
        
        options.onMetricsUpdate?.({ timeToFirstByte, timeToInteractive });
      }
    }
  }, [options.trackBundleSize, options.onMetricsUpdate]);

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      if (usedMemory > 100) { // 100MB threshold
        console.warn(`High memory usage: ${usedMemory.toFixed(2)}MB`);
      }
    }
  }, []);

  // Track long tasks
  const trackLongTasks = useCallback(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 50ms threshold
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    trackBundleSize();
    trackMemoryUsage();
    const cleanup = trackLongTasks();
    
    return cleanup;
  }, [trackBundleSize, trackMemoryUsage, trackLongTasks]);

  useEffect(() => {
    trackRender();
    
    return () => {
      endRender();
    };
  }, [trackRender, endRender]);

  return {
    metrics: metrics.current,
    trackRender,
    endRender,
    trackBundleSize,
    trackMemoryUsage,
  };
}

// Convenience hook for component performance tracking
export function useComponentPerformance(componentName: string) {
  return usePerformance({
    trackRenderTime: true,
    onMetricsUpdate: (metrics) => {
      if (metrics.renderTime && metrics.renderTime > 16) {
        console.warn(`${componentName} slow render: ${metrics.renderTime.toFixed(2)}ms`);
      }
    },
  });
}
