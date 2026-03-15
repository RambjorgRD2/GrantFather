import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
  scrollContainer?: HTMLElement | null;
}

interface VirtualScrollResult<T> {
  virtualItems: Array<{
    index: number;
    data: T;
    offsetTop: number;
    isVisible: boolean;
  }>;
  totalHeight: number;
  scrollTop: number;
  containerRef: React.RefObject<HTMLElement>;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const { itemHeight, overscan = 5, containerHeight = 400, scrollContainer } = options;
  
  const containerRef = useRef<HTMLElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightState, setContainerHeightState] = useState(containerHeight);

  // Calculate total height
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeightState) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, containerHeightState, itemHeight, overscan, items.length]);

  // Create virtual items
  const virtualItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const result = [];

    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < items.length) {
        result.push({
          index: i,
          data: items[i],
          offsetTop: i * itemHeight,
          isVisible: i >= startIndex && i <= endIndex,
        });
      }
    }

    return result;
  }, [visibleRange, items, itemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    scrollToIndex(items.length - 1);
  }, [scrollToIndex, items.length]);

  // Resize observer for dynamic container height
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeightState(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainer || containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainer, handleScroll]);

  // Auto-scroll to top when items change
  useEffect(() => {
    if (scrollTop > 0) {
      setScrollTop(0);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [items.length]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    containerRef,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
}

// Specialized hook for table virtualization
export function useVirtualTable<T>(
  items: T[],
  options: VirtualScrollOptions & { columns: number }
) {
  const virtualScroll = useVirtualScroll(items, options);
  
  const virtualRows = useMemo(() => {
    const rows = [];
    const itemsPerRow = Math.ceil(items.length / options.columns);
    
    for (let i = 0; i < itemsPerRow; i++) {
      const rowItems = items.slice(i * options.columns, (i + 1) * options.columns);
      rows.push({
        index: i,
        items: rowItems,
        offsetTop: i * options.itemHeight,
      });
    }
    
    return rows;
  }, [items, options.columns, options.itemHeight]);

  return {
    ...virtualScroll,
    virtualRows,
  };
}

// Hook for infinite scrolling with virtualization
export function useInfiniteVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions & {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    threshold?: number;
  }
) {
  const virtualScroll = useVirtualScroll(items, options);
  const { threshold = 0.8 } = options;

  // Check if we should fetch next page
  useEffect(() => {
    if (!options.hasNextPage || options.isFetchingNextPage) return;

    const { startIndex, endIndex } = virtualScroll.virtualItems.reduce(
      (acc, item) => ({
        startIndex: Math.min(acc.startIndex, item.index),
        endIndex: Math.max(acc.endIndex, item.index),
      }),
      { startIndex: Infinity, endIndex: -Infinity }
    );

    const thresholdIndex = Math.floor(items.length * threshold);
    
    if (endIndex >= thresholdIndex) {
      options.fetchNextPage();
    }
  }, [virtualScroll.virtualItems, options.hasNextPage, options.isFetchingNextPage, options.fetchNextPage, items.length, threshold]);

  return virtualScroll;
}

// Hook for horizontal virtualization
export function useHorizontalVirtualScroll<T>(
  items: T[],
  options: Omit<VirtualScrollOptions, 'itemHeight'> & { itemWidth: number }
) {
  const { itemWidth, overscan = 5, containerHeight = 400, scrollContainer } = options;
  
  const containerRef = useRef<HTMLElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(400);

  // Calculate total width
  const totalWidth = useMemo(() => items.length * itemWidth, [items.length, itemWidth]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollLeft / itemWidth) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollLeft + containerWidth) / itemWidth) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollLeft, containerWidth, itemWidth, overscan, items.length]);

  // Create virtual items
  const virtualItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const result = [];

    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < items.length) {
        result.push({
          index: i,
          data: items[i],
          offsetLeft: i * itemWidth,
          isVisible: i >= startIndex && i <= endIndex,
        });
      }
    }

    return result;
  }, [visibleRange, items, itemWidth]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollLeft(target.scrollLeft);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollLeft = index * itemWidth;
      containerRef.current.scrollLeft = scrollLeft;
      setScrollLeft(scrollLeft);
    }
  }, [itemWidth]);

  // Resize observer for dynamic container width
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainer || containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainer, handleScroll]);

  return {
    virtualItems,
    totalWidth,
    scrollLeft,
    containerRef,
    scrollToIndex,
  };
}
