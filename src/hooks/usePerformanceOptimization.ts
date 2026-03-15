/**
 * Performance Optimization Hook
 * Provides caching, debouncing, and performance monitoring for React components
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheService } from '@/services/cacheService';
import { performanceService } from '@/services/performanceService';

export interface PerformanceConfig {
  enableCaching: boolean;
  enableDebouncing: boolean;
  enableMonitoring: boolean;
  cacheTtl?: number;
  debounceDelay?: number;
}

export interface OptimizedQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  retry?: boolean | number;
  retryDelay?: number;
}

/**
 * Hook for performance-optimized data fetching
 */
export function useOptimizedQuery<T>(
  options: OptimizedQueryOptions,
  config: PerformanceConfig = {
    enableCaching: true,
    enableDebouncing: true,
    enableMonitoring: true,
    cacheTtl: 5 * 60 * 1000, // 5 minutes
    debounceDelay: 300,
  }
) {
  const queryClient = useQueryClient();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate cache key
  const cacheKey = useMemo(() => {
    return cacheService.generateApiKey(options.queryKey.join(':'), {});
  }, [options.queryKey]);

  // Optimized query function with caching
  const optimizedQueryFn = useCallback(async () => {
    const start = performance.now();
    try {
      if (config.enableCaching) {
        const result = await cacheService.getOrSet(
          cacheKey,
          options.queryFn,
          config.cacheTtl
        );
        if (config.enableMonitoring) {
          performanceService.trackAuthPerformance(
            `query:${options.queryKey.join(':')}`,
            performance.now() - start,
            true
          );
        }
        return result;
      }
      const result = await options.queryFn();
      if (config.enableMonitoring) {
        performanceService.trackAuthPerformance(
          `query:${options.queryKey.join(':')}`,
          performance.now() - start,
          true
        );
      }
      return result;
    } catch (error) {
      if (config.enableMonitoring) {
        performanceService.trackAuthPerformance(
          `query:${options.queryKey.join(':')}`,
          performance.now() - start,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;
    }
  }, [options.queryFn, cacheKey, config]);

  // Debounced query function
  const debouncedQueryFn = useCallback(() => {
    if (!config.enableDebouncing) {
      return optimizedQueryFn();
    }

    setIsDebouncing(true);

    return new Promise<T>((resolve, reject) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await optimizedQueryFn();
          setIsDebouncing(false);
          resolve(result);
        } catch (error) {
          setIsDebouncing(false);
          reject(error);
        }
      }, config.debounceDelay);
    });
  }, [optimizedQueryFn, config]);

  // Use React Query with optimized settings
  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: debouncedQueryFn,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 10 * 60 * 1000,
    enabled: options.enabled,
    retry: options.retry !== false,
    retryDelay: options.retryDelay || 1000,
  });

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...query,
    isDebouncing,
    cacheKey,
  };
}

/**
 * Hook for debounced input handling
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = 300
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor(
  componentName: string,
  config: PerformanceConfig = {
    enableMonitoring: true,
    enableCaching: false,
    enableDebouncing: false,
  }
) {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });

  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    if (!config.enableMonitoring) return;

    renderStartTime.current = performance.now();
    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
    }));

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({
        ...prev,
        lastRenderTime: renderTime,
        averageRenderTime: (prev.averageRenderTime + renderTime) / 2,
      }));

      // Track performance
      performanceService.trackAuthPerformance(
        `render:${componentName}`,
        renderTime,
        true
      );
    };
  });

  return metrics;
}

/**
 * Hook for memoized expensive computations
 */
export function useMemoizedComputation<T, D>(
  computation: (data: D) => T,
  data: D,
  dependencies: any[] = []
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = computation(data);
    const endTime = performance.now();

    performanceService.trackAuthPerformance(
      'computation:memoized',
      endTime - startTime,
      true
    );

    return result;
  }, [computation, data, ...dependencies]);
}

/**
 * Hook for optimized list rendering
 */
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
    visibleRange,
  };
}

/**
 * Hook for cache management
 */
export function useCacheManagement() {
  const queryClient = useQueryClient();

  const invalidateCache = useCallback((pattern: string) => {
    const deletedCount = cacheService.invalidatePattern(pattern);
    queryClient.invalidateQueries();
    return deletedCount;
  }, [queryClient]);

  const clearCache = useCallback(() => {
    cacheService.clear();
    queryClient.clear();
  }, [queryClient]);

  const getCacheStats = useCallback(() => {
    return cacheService.getStats();
  }, []);

  return {
    invalidateCache,
    clearCache,
    getCacheStats,
  };
}

/**
 * Hook for performance optimization
 */
export function usePerformanceOptimization(
  componentName: string,
  config: PerformanceConfig = {
    enableCaching: true,
    enableDebouncing: true,
    enableMonitoring: true,
  }
) {
  const metrics = usePerformanceMonitor(componentName, config);
  const cacheManagement = useCacheManagement();

  return {
    metrics,
    cacheManagement,
    config,
  };
}