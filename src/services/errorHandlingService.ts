/**
 * Comprehensive Error Handling Service
 * Provides centralized error handling, logging, and user feedback
 */

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  applicationId?: string;
  organizationId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userMessage: string;
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Log an error with context and severity
   */
  public logError(
    error: Error | string,
    context: Partial<ErrorContext>,
    severity: ErrorDetails['severity'] = 'medium',
    retryable: boolean = false
  ): ErrorDetails {
    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : error,
      code: error instanceof Error ? (error as any).code : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        component: context.component || 'unknown',
        action: context.action || 'unknown',
        userId: context.userId,
        applicationId: context.applicationId,
        organizationId: context.organizationId,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
      severity,
      retryable,
      userMessage: this.generateUserMessage(error, severity),
    };

    // Add to log
    this.errorLog.unshift(errorDetails);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console based on severity
    this.logToConsole(errorDetails);

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(errorDetails);
    }

    return errorDetails;
  }

  /**
   * Handle AI generation errors with retry logic
   */
  public async handleAIError(
    error: Error,
    context: Partial<ErrorContext>,
    retryFunction?: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<any> {
    const errorDetails = this.logError(error, context, 'high', true);

    if (retryFunction && maxRetries > 0) {
      try {
        // Exponential backoff
        const delay = Math.pow(2, 3 - maxRetries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return await retryFunction();
      } catch (retryError) {
        return this.handleAIError(retryError, context, retryFunction, maxRetries - 1);
      }
    }

    throw error;
  }

  /**
   * Handle database errors with specific user messages
   */
  public handleDatabaseError(
    error: any,
    context: Partial<ErrorContext>
  ): ErrorDetails {
    let userMessage = 'A database error occurred. Please try again.';
    let severity: ErrorDetails['severity'] = 'medium';

    if (error.code === 'PGRST201') {
      userMessage = 'Data relationship error. Please refresh the page.';
      severity = 'high';
    } else if (error.code === '23505') {
      userMessage = 'This item already exists. Please check your data.';
      severity = 'low';
    } else if (error.code === '23503') {
      userMessage = 'Referenced data not found. Please refresh the page.';
      severity = 'high';
    } else if (error.message?.includes('permission denied')) {
      userMessage = 'You do not have permission to perform this action.';
      severity = 'high';
    }

    return this.logError(error, context, severity, false);
  }

  /**
   * Handle network errors with retry suggestions
   */
  public handleNetworkError(
    error: any,
    context: Partial<ErrorContext>
  ): ErrorDetails {
    let userMessage = 'Network error. Please check your connection.';
    let retryable = true;

    if (error.name === 'AbortError') {
      userMessage = 'Request timed out. Please try again.';
    } else if (error.status === 429) {
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (error.status >= 500) {
      userMessage = 'Server error. Please try again later.';
    } else if (error.status === 404) {
      userMessage = 'Resource not found. Please refresh the page.';
      retryable = false;
    }

    return this.logError(error, context, 'medium', retryable);
  }

  /**
   * Get user-friendly error message
   */
  private generateUserMessage(error: Error | string, severity: ErrorDetails['severity']): string {
    const message = error instanceof Error ? error.message : error;

    // AI generation errors
    if (message.includes('AI') || message.includes('generation')) {
      return 'Content generation failed. Please try again or contact support if the issue persists.';
    }

    // Database errors
    if (message.includes('database') || message.includes('query')) {
      return 'Data error occurred. Please refresh the page and try again.';
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection error. Please check your internet connection and try again.';
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'Authentication error. Please log in again.';
    }

    // Default messages based on severity
    switch (severity) {
      case 'critical':
        return 'A critical error occurred. Please contact support immediately.';
      case 'high':
        return 'An error occurred. Please try again or contact support.';
      case 'medium':
        return 'Something went wrong. Please try again.';
      case 'low':
        return 'A minor issue occurred. You can continue using the application.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Log error to console with appropriate level
   */
  private logToConsole(errorDetails: ErrorDetails): void {
    const logMessage = `[${errorDetails.severity.toUpperCase()}] ${errorDetails.context.component}: ${errorDetails.message}`;
    
    switch (errorDetails.severity) {
      case 'critical':
      case 'high':
        console.error(logMessage, errorDetails);
        break;
      case 'medium':
        console.warn(logMessage, errorDetails);
        break;
      case 'low':
        console.info(logMessage, errorDetails);
        break;
    }
  }

  /**
   * Send error to external logging service
   */
  private async sendToExternalLogger(errorDetails: ErrorDetails): Promise<void> {
    try {
      // In a real implementation, this would send to services like Sentry, LogRocket, etc.
      // For now, we'll just store in localStorage for debugging
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorDetails);
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50 errors
    } catch (e) {
      console.error('Failed to send error to external logger:', e);
    }
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(limit: number = 10): ErrorDetails[] {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
  } {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
    };

    this.errorLog.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byComponent[error.context.component] = (stats.byComponent[error.context.component] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();

// Export React hook for easy use in components
export function useErrorHandler() {
  return {
    logError: errorHandlingService.logError.bind(errorHandlingService),
    handleError: errorHandlingService.logError.bind(errorHandlingService), // Add alias for compatibility
    handleAIError: errorHandlingService.handleAIError.bind(errorHandlingService),
    handleDatabaseError: errorHandlingService.handleDatabaseError.bind(errorHandlingService),
    handleNetworkError: errorHandlingService.handleNetworkError.bind(errorHandlingService),
    getRecentErrors: errorHandlingService.getRecentErrors.bind(errorHandlingService),
    getErrorStats: errorHandlingService.getErrorStats.bind(errorHandlingService),
  };
}
