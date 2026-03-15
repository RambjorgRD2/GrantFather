import { useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

interface UseOptimizedQueryOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  // Custom options for optimization
  prefetchOnHover?: boolean;
  prefetchOnFocus?: boolean;
  keepPreviousData?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retryDelay?: number;
  maxRetries?: number;
}

interface UseOptimizedQueryReturn<TData, TError> {
  // Query result properties
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  // Additional optimization methods
  prefetch: () => void;
  invalidate: () => void;
  refetchOptimized: () => void;
}

export function useOptimizedQuery<TData, TError>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: UseOptimizedQueryOptions<TData, TError> = {}
): UseOptimizedQueryReturn<TData, TError> {
  const queryClient = useQueryClient();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout>();
  const isPrefetchingRef = useRef(false);

  // Optimized default options
  const optimizedOptions: UseQueryOptions<TData, TError> = {
    queryKey,
    queryFn,
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options.cacheTime || 10 * 60 * 1000, // 10 minutes
    retryDelay: options.retryDelay || ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)),
    retry: options.maxRetries || 3,
    ...options,
  };

  // Main query
  const query = useQuery(optimizedOptions);

  // Prefetch function
  const prefetch = useCallback(async () => {
    if (isPrefetchingRef.current) return;
    
    isPrefetchingRef.current = true;
    try {
      await queryClient.prefetchQuery(optimizedOptions);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    } finally {
      isPrefetchingRef.current = false;
    }
  }, [queryClient, optimizedOptions]);

  // Invalidate function
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Optimized refetch with debouncing
  const refetchOptimized = useCallback(() => {
    if (query.isFetching) return;
    query.refetch();
  }, [query]);

  // Prefetch on hover (with debouncing)
  useEffect(() => {
    if (!options.prefetchOnHover) return;

    const handleMouseEnter = () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
      
      prefetchTimeoutRef.current = setTimeout(() => {
        prefetch();
      }, 100); // 100ms delay to avoid unnecessary prefetching
    };

    const handleMouseLeave = () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };

    // Find the closest interactive element to attach events
    const element = document.querySelector('[data-query-key]') || document.body;
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [options.prefetchOnHover, prefetch]);

  // Prefetch on focus
  useEffect(() => {
    if (!options.prefetchOnFocus) return;

    const handleFocus = () => {
      prefetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [options.prefetchOnFocus, prefetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    prefetch,
    invalidate,
    refetchOptimized,
  };
}

// Specialized hooks for common use cases
export function useOptimizedListQuery<TData, TError>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: UseOptimizedQueryOptions<TData, TError> = {}
) {
  return useOptimizedQuery(queryKey, queryFn, {
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes for lists
    ...options,
  });
}

export function useOptimizedDetailQuery<TData, TError>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: UseOptimizedQueryOptions<TData, TError> = {}
) {
  return useOptimizedQuery(queryKey, queryFn, {
    staleTime: 10 * 60 * 1000, // 10 minutes for detail views
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    ...options,
  });
}

export function useOptimizedFormQuery<TData, TError>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: UseOptimizedQueryOptions<TData, TError> = {}
) {
  return useOptimizedQuery(queryKey, queryFn, {
    staleTime: 0, // Always fresh for forms
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    ...options,
  });
}

// Hook for managing query state across components
export function useQueryState<TData>(
  queryKey: readonly unknown[],
  defaultValue: TData
) {
  const queryClient = useQueryClient();
  
  const getData = useCallback(() => {
    return queryClient.getQueryData(queryKey) as TData | undefined;
  }, [queryClient, queryKey]);

  const setData = useCallback((data: TData) => {
    queryClient.setQueryData(queryKey, data);
  }, [queryClient, queryKey]);

  const getDataOrDefault = useCallback(() => {
    return getData() ?? defaultValue;
  }, [getData, defaultValue]);

  return {
    getData,
    setData,
    getDataOrDefault,
    defaultValue,
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate<TData>(
  queryKey: readonly unknown[],
  updateFn: (oldData: TData | undefined) => TData
) {
  const queryClient = useQueryClient();
  
  const updateOptimistically = useCallback(() => {
    queryClient.setQueryData(queryKey, updateFn);
  }, [queryClient, queryKey, updateFn]);

  const revertOptimisticUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    updateOptimistically,
    revertOptimisticUpdate,
  };
}
