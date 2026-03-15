/**
 * Comprehensive Error Recovery Service
 * Provides advanced error handling, recovery strategies, and user-friendly error messages
 */

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  organizationId?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  canRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackAction?: string;
}

export interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  strategy: ErrorRecoveryStrategy;
  attempts: number;
  resolved: boolean;
  resolution?: string;
}

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private errorReports: Map<string, ErrorReport> = new Map();
  private retryQueues: Map<string, ErrorReport[]> = new Map();

  public static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Get recovery strategy for specific error types
   */
  public getRecoveryStrategy(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      return {
        id: 'network-retry',
        name: 'Network Retry',
        description: 'Retry network request with exponential backoff',
        canRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        fallbackAction: 'Show offline mode'
      };
    }

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('auth') || errorName.includes('auth')) {
      return {
        id: 'auth-refresh',
        name: 'Authentication Refresh',
        description: 'Refresh authentication and retry',
        canRetry: true,
        maxRetries: 2,
        retryDelay: 500,
        fallbackAction: 'Redirect to login'
      };
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('sql') || errorMessage.includes('rpc')) {
      return {
        id: 'database-retry',
        name: 'Database Retry',
        description: 'Retry database operation with connection check',
        canRetry: true,
        maxRetries: 2,
        retryDelay: 2000,
        fallbackAction: 'Show cached data'
      };
    }

    // AI/API errors
    if (errorMessage.includes('ai') || errorMessage.includes('api') || errorMessage.includes('generation')) {
      return {
        id: 'ai-fallback',
        name: 'AI Fallback',
        description: 'Use fallback AI provider or cached content',
        canRetry: true,
        maxRetries: 2,
        retryDelay: 3000,
        fallbackAction: 'Use manual input'
      };
    }

    // Default strategy
    return {
      id: 'generic-retry',
      name: 'Generic Retry',
      description: 'Retry operation with basic backoff',
      canRetry: true,
      maxRetries: 1,
      retryDelay: 1000,
      fallbackAction: 'Show error message'
    };
  }

  /**
   * Report and handle error with recovery strategy
   */
  public async handleError(
    error: Error,
    context: ErrorContext,
    retryFunction?: () => Promise<any>
  ): Promise<{ success: boolean; result?: any; error?: Error }> {
    const errorId = this.generateErrorId(error, context);
    const strategy = this.getRecoveryStrategy(error, context);
    
    const errorReport: ErrorReport = {
      id: errorId,
      error,
      context,
      strategy,
      attempts: 0,
      resolved: false
    };

    this.errorReports.set(errorId, errorReport);

    // Log error for debugging
    console.error(`🚨 Error Recovery: ${strategy.name}`, {
      error: error.message,
      context,
      strategy
    });

    // If no retry function provided, return error
    if (!retryFunction || !strategy.canRetry) {
      return { success: false, error };
    }

    // Attempt recovery
    return this.attemptRecovery(errorReport, retryFunction);
  }

  /**
   * Attempt error recovery with retry logic
   */
  private async attemptRecovery(
    errorReport: ErrorReport,
    retryFunction: () => Promise<any>
  ): Promise<{ success: boolean; result?: any; error?: Error }> {
    const { strategy } = errorReport;

    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      try {
        errorReport.attempts = attempt;
        
        // Wait before retry (exponential backoff)
        if (attempt > 1) {
          const delay = strategy.retryDelay * Math.pow(2, attempt - 2);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`🔄 Error Recovery: Attempt ${attempt}/${strategy.maxRetries}`, {
          errorId: errorReport.id,
          strategy: strategy.name
        });

        const result = await retryFunction();
        
        // Success - mark as resolved
        errorReport.resolved = true;
        errorReport.resolution = `Resolved after ${attempt} attempts`;
        
        console.log(`✅ Error Recovery: Success after ${attempt} attempts`, {
          errorId: errorReport.id
        });

        return { success: true, result };
      } catch (retryError) {
        console.warn(`⚠️ Error Recovery: Attempt ${attempt} failed`, {
          errorId: errorReport.id,
          retryError: retryError instanceof Error ? retryError.message : 'Unknown error'
        });

        // If this was the last attempt, return the original error
        if (attempt === strategy.maxRetries) {
          errorReport.resolution = `Failed after ${attempt} attempts`;
          return { success: false, error: retryError as Error };
        }
      }
    }

    return { success: false, error: errorReport.error };
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyMessage(error: Error, context: ErrorContext): string {
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Connection issue detected. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('timeout')) {
      return 'The request is taking longer than expected. Please try again in a moment.';
    }

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      return 'Your session has expired. Please log in again to continue.';
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('sql')) {
      return 'We\'re experiencing technical difficulties. Please try again in a few moments.';
    }

    // AI errors
    if (errorMessage.includes('ai') || errorMessage.includes('generation')) {
      return 'AI service is temporarily unavailable. You can continue with manual input.';
    }

    // Generic error
    return 'Something went wrong. Please try again or contact support if the issue persists.';
  }

  /**
   * Get recovery suggestions for user
   */
  public getRecoverySuggestions(error: Error, context: ErrorContext): string[] {
    const suggestions: string[] = [];
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Wait a moment and try again');
    }

    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      suggestions.push('Log out and log back in');
      suggestions.push('Clear your browser cache');
      suggestions.push('Try a different browser');
    }

    if (errorMessage.includes('database') || errorMessage.includes('sql')) {
      suggestions.push('Try again in a few moments');
      suggestions.push('Refresh the page');
      suggestions.push('Contact support if the issue persists');
    }

    if (errorMessage.includes('ai') || errorMessage.includes('generation')) {
      suggestions.push('Try a different AI provider');
      suggestions.push('Use manual input instead');
      suggestions.push('Save your work and try again later');
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(error: Error, context: ErrorContext): string {
    const timestamp = Date.now();
    const component = context.component.replace(/[^a-zA-Z0-9]/g, '');
    const action = context.action.replace(/[^a-zA-Z0-9]/g, '');
    const errorHash = error.message.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '');
    
    return `${component}-${action}-${errorHash}-${timestamp}`;
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    resolvedErrors: number;
    unresolvedErrors: number;
    errorTypes: Record<string, number>;
  } {
    const reports = Array.from(this.errorReports.values());
    
    const errorTypes: Record<string, number> = {};
    reports.forEach(report => {
      const type = report.strategy.id;
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return {
      totalErrors: reports.length,
      resolvedErrors: reports.filter(r => r.resolved).length,
      unresolvedErrors: reports.filter(r => !r.resolved).length,
      errorTypes
    };
  }

  /**
   * Clear resolved errors
   */
  public clearResolvedErrors(): void {
    const unresolved = Array.from(this.errorReports.entries())
      .filter(([_, report]) => !report.resolved);
    
    this.errorReports.clear();
    unresolved.forEach(([id, report]) => {
      this.errorReports.set(id, report);
    });
  }
}

export const errorRecoveryService = ErrorRecoveryService.getInstance();
