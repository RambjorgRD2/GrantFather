import { useState, useCallback } from 'react';
import { checkSessionHealth, forceSessionRefresh, type SessionHealthCheck } from '@/utils/sessionUtils';
import { logger } from '@/utils/logger';

interface SessionRecoveryState {
  isRecovering: boolean;
  lastHealthCheck: SessionHealthCheck | null;
  recoveryAttempts: number;
}

/**
 * Hook for managing session recovery operations
 * Provides utilities to diagnose and fix authentication issues
 */
export function useSessionRecovery() {
  const [recoveryState, setRecoveryState] = useState<SessionRecoveryState>({
    isRecovering: false,
    lastHealthCheck: null,
    recoveryAttempts: 0
  });

  const performHealthCheck = useCallback(async (): Promise<SessionHealthCheck> => {
    logger.info('Performing session health check...');
    
    const healthCheck = await checkSessionHealth();
    
    setRecoveryState(prev => ({
      ...prev,
      lastHealthCheck: healthCheck
    }));
    
    logger.info('Health check completed:', {
      isHealthy: healthCheck.isHealthy,
      error: healthCheck.error,
      needsRefresh: healthCheck.needsRefresh
    });
    
    return healthCheck;
  }, []);

  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (recoveryState.isRecovering) {
      logger.warn('Recovery already in progress, skipping...');
      return false;
    }

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      logger.info(`Starting session recovery attempt ${recoveryState.recoveryAttempts + 1}...`);
      
      // First, check current session health
      const initialCheck = await checkSessionHealth();
      
      if (initialCheck.isHealthy) {
        logger.info('Session is already healthy, no recovery needed');
        return true;
      }

      // Attempt forced refresh
      logger.info('Session unhealthy, attempting forced refresh...');
      const refreshResult = await forceSessionRefresh();
      
      if (refreshResult.isHealthy) {
        logger.info('Session recovery successful');
        setRecoveryState(prev => ({
          ...prev,
          lastHealthCheck: refreshResult
        }));
        return true;
      }

      logger.error('Session recovery failed:', refreshResult.error);
      return false;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown recovery error';
      logger.error('Session recovery error:', errorMessage);
      return false;
    } finally {
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false
      }));
    }
  }, [recoveryState.isRecovering, recoveryState.recoveryAttempts]);

  const resetRecoveryState = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      lastHealthCheck: null,
      recoveryAttempts: 0
    });
  }, []);

  return {
    recoveryState,
    performHealthCheck,
    attemptRecovery,
    resetRecoveryState,
    isSessionHealthy: recoveryState.lastHealthCheck?.isHealthy ?? null,
    lastError: recoveryState.lastHealthCheck?.error ?? null
  };
}