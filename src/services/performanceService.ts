// Performance monitoring service for auth flow
interface PerformanceMetric {
  action: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  // Track performance of auth operations
  trackAuthPerformance = (action: string, duration: number, success: boolean, error?: string) => {
    const metric: PerformanceMetric = {
      action,
      duration,
      timestamp: Date.now(),
      success,
      error,
    };

    this.metrics.push(metric);

    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Performance: ${action} took ${duration}ms (${success ? 'success' : 'failed'})`);
    }
  };

  // Get performance summary
  getPerformanceSummary = () => {
    const successful = this.metrics.filter(m => m.success);
    const failed = this.metrics.filter(m => !m.success);

    return {
      total: this.metrics.length,
      successful: successful.length,
      failed: failed.length,
      averageDuration: successful.reduce((sum, m) => sum + m.duration, 0) / successful.length || 0,
      recentMetrics: this.metrics.slice(-10), // Last 10 metrics
    };
  };

  // Clear metrics
  clearMetrics = () => {
    this.metrics = [];
  };

  // Get metrics for specific action
  getMetricsForAction = (action: string) => {
    return this.metrics.filter(m => m.action === action);
  };
}

export const performanceService = new PerformanceService();

// Performance tracking decorator
export const trackPerformance = (action: string) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        const duration = performance.now() - start;
        performanceService.trackAuthPerformance(action, duration, success, error);
      }
    };
  };
};

// Utility function to track async operations
export const trackAsyncOperation = async <T>(
  action: string,
  operation: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  let success = true;
  let error: string | undefined;

  try {
    const result = await operation();
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const duration = performance.now() - start;
    performanceService.trackAuthPerformance(action, duration, success, error);
  }
};