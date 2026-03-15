import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SessionHealthCheck {
  isHealthy: boolean;
  userId?: string;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * Enhanced session health check with comprehensive debugging
 * Validates session, JWT tokens, and database auth.uid() availability
 */
export async function checkSessionHealth(retryOnFailure = true): Promise<SessionHealthCheck> {
  try {
    logger.info('Starting comprehensive session health check...');
    
    // Step 1: Get current session with detailed logging
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logger.error('Session retrieval error:', {
        message: sessionError.message,
        code: sessionError.status,
        details: sessionError
      });
      return {
        isHealthy: false,
        error: `Session error: ${sessionError.message}`,
        needsRefresh: true
      };
    }

    if (!session || !session.user) {
      logger.warn('No active session found');
      return {
        isHealthy: false,
        error: 'No active session found',
        needsRefresh: false
      };
    }

    // Step 2: Validate JWT token structure and expiration
    const now = Math.floor(Date.now() / 1000);
    const tokenExpiry = session.expires_at;
    const timeUntilExpiry = tokenExpiry ? tokenExpiry - now : 0;

    logger.info('Session validation details:', {
      userId: session.user.id,
      tokenExpiry,
      timeUntilExpiry: `${timeUntilExpiry}s`,
      hasRefreshToken: !!session.refresh_token,
      accessTokenLength: session.access_token?.length || 0
    });

    // Check if token is expired or expires soon (within 60 seconds)
    if (timeUntilExpiry < 60) {
      logger.warn('Access token expired or expires soon, attempting refresh...');
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        logger.error('Session refresh failed:', refreshError.message);
        return {
          isHealthy: false,
          error: `Session refresh failed: ${refreshError.message}`,
          needsRefresh: true
        };
      }

      logger.info('Session refreshed successfully');
      // Use the refreshed session for further checks
      if (refreshData.session) {
        session.access_token = refreshData.session.access_token;
        session.expires_at = refreshData.session.expires_at;
      }
    }

    // Step 3: Test database auth.uid() availability with comprehensive error handling
    logger.info('Testing database auth.uid() availability...');
    
    const testPayload = {
      user_id: session.user.id,
      level: 'info' as const,
      source: 'session_health_check',
      message: 'Enhanced session health check - testing auth.uid() availability',
      data: { 
        session_user_id: session.user.id,
        timestamp: new Date().toISOString(),
        token_expiry: tokenExpiry,
        check_type: 'comprehensive'
      }
    };

    const { data, error: testError } = await supabase
      .from('debug_logs')
      .insert(testPayload)
      .select('id')
      .single();

    if (testError) {
      logger.error('Database auth test failed:', {
        message: testError.message,
        code: testError.code,
        details: testError.details,
        hint: testError.hint
      });
      
      // Check if this is an RLS policy error (auth.uid() returning NULL)
      if ((testError.code === '42501' || testError.message.includes('row-level security')) && retryOnFailure) {
        logger.info('RLS policy violation detected, attempting comprehensive session recovery...');
        
        // First, try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          logger.error('Session refresh during recovery failed:', refreshError.message);
          return {
            isHealthy: false,
            error: `Session refresh failed during recovery: ${refreshError.message}`,
            needsRefresh: true
          };
        }

        // Wait longer for the refresh to propagate
        logger.info('Session refreshed, waiting for propagation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Retry the health check once (without retry to prevent infinite loop)
        return checkSessionHealth(false);
      }

      return {
        isHealthy: false,
        userId: session.user.id,
        error: `Database auth test failed: ${testError.message} (${testError.code})`,
        needsRefresh: testError.code === '42501' || testError.message.includes('row-level security')
      };
    }

    // Step 4: Successful health check with detailed logging
    logger.info('Session health check passed successfully:', {
      userId: session.user.id,
      debugLogId: data?.id,
      tokenValid: true,
      databaseAuthWorking: true
    });

    return {
      isHealthy: true,
      userId: session.user.id
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown session error';
    logger.error('Unexpected session health check error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      isHealthy: false,
      error: errorMessage,
      needsRefresh: true
    };
  }
}

/**
 * Force a complete session refresh and validation cycle
 */
export async function forceSessionRefresh(): Promise<SessionHealthCheck> {
  try {
    logger.info('Forcing complete session refresh...');
    
    // Clear any cached session data
    await supabase.auth.refreshSession();
    
    // Wait for the refresh to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Perform a fresh health check
    const healthCheck = await checkSessionHealth(false);
    
    if (healthCheck.isHealthy) {
      logger.info('Force refresh successful');
    } else {
      logger.error('Force refresh failed:', healthCheck.error);
    }
    
    return healthCheck;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Force refresh failed';
    logger.error('Force session refresh error:', errorMessage);
    
    return {
      isHealthy: false,
      error: errorMessage,
      needsRefresh: true
    };
  }
}

/**
 * Pre-flight validation for organization creation
 * Checks if user can perform organization insertion before attempting
 */
export async function validateOrganizationInsertPolicy(): Promise<{
  canInsert: boolean;
  error?: string;
  suggestion?: string;
}> {
  try {
    // First, perform session health check
    const healthCheck = await checkSessionHealth();
    
    if (!healthCheck.isHealthy) {
      return {
        canInsert: false,
        error: healthCheck.error,
        suggestion: healthCheck.needsRefresh 
          ? 'Please refresh the page and try again' 
          : 'Please sign in again'
      };
    }

    // Test if we can call the session validation function
    const { data, error } = await supabase.rpc('validate_user_session');
    
    if (error) {
      logger.error('Session validation function failed:', error.message);
      return {
        canInsert: false,
        error: `Session validation failed: ${error.message}`,
        suggestion: 'Please refresh the page and try again'
      };
    }

    if (!data) {
      return {
        canInsert: false,
        error: 'Session validation returned no user ID',
        suggestion: 'Please sign out and sign in again'
      };
    }

    return {
      canInsert: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    logger.error('Pre-flight validation error:', errorMessage);
    
    return {
      canInsert: false,
      error: errorMessage,
      suggestion: 'Please refresh the page and try again'
    };
  }
}

/**
 * Retry utility with exponential backoff for auth-related operations
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // For RLS policy violations, try refreshing session
      if (error instanceof Error && error.message.includes('42501')) {
        logger.info(`RLS policy violation on attempt ${attempt}, refreshing session...`);
        await supabase.auth.refreshSession();
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000); // Max 10s delay
      logger.info(`Retrying operation in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Enhanced error handler for RLS policy violations
 * Provides user-friendly messages and recovery suggestions
 */
export function handleRLSError(error: any): {
  userMessage: string;
  technicalMessage: string;
  recoveryAction: 'retry' | 'refresh' | 'signin' | 'contact_support';
} {
  const errorMessage = error?.message || 'Unknown error';
  const errorCode = error?.code;
  
  // RLS policy violation
  if (errorCode === '42501' || errorMessage.includes('row-level security')) {
    return {
      userMessage: 'Authentication issue detected. Please try again in a moment.',
      technicalMessage: `RLS Policy Violation: ${errorMessage}`,
      recoveryAction: 'retry'
    };
  }
  
  // Session-related errors
  if (errorMessage.includes('session') || errorMessage.includes('auth.uid')) {
    return {
      userMessage: 'Your session has expired. Please refresh the page and sign in again.',
      technicalMessage: `Session Error: ${errorMessage}`,
      recoveryAction: 'refresh'
    };
  }
  
  // Database connection errors
  if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return {
      userMessage: 'Connection issue. Please check your internet connection and try again.',
      technicalMessage: `Connection Error: ${errorMessage}`,
      recoveryAction: 'retry'
    };
  }
  
  // Generic database errors
  return {
    userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    technicalMessage: errorMessage,
    recoveryAction: 'contact_support'
  };
}