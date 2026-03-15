import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  errorRecoveryService,
  ErrorContext,
} from '@/services/errorRecoveryService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Create error context for recovery service
    const errorContext: ErrorContext = {
      component: this.constructor.name,
      action: 'render',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Report error to recovery service
    errorRecoveryService.handleError(error, errorContext);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Get user-friendly error message and suggestions
      const errorContext: ErrorContext = {
        component: this.constructor.name,
        action: 'render',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const userMessage = this.state.error
        ? errorRecoveryService.getUserFriendlyMessage(
            this.state.error,
            errorContext
          )
        : 'An unexpected error occurred. Please try one of the options below.';

      const suggestions = this.state.error
        ? errorRecoveryService.getRecoverySuggestions(
            this.state.error,
            errorContext
          )
        : [
            'Try refreshing the page',
            'Clear your browser cache',
            'Contact support if the issue persists',
          ];

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription className="text-sm">
                {userMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recovery suggestions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Try these solutions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="w-full"
                  variant="ghost"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Auth-specific error boundary
export function AuthErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle>Authentication Error</CardTitle>
              <CardDescription>
                There was a problem with your authentication. Please try
                refreshing the page or contact support if the issue persists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button
                onClick={() => (window.location.href = '/login')}
                className="w-full"
                variant="outline"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log auth-specific errors
        console.error('Auth Error Boundary:', error, errorInfo);
        // Could send to error reporting service here
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
