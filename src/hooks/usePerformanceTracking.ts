import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceEvent {
  type: 'language_switch' | 'ai_generation' | 'edge_function_call';
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export function usePerformanceTracking() {
  const [isTracking, setIsTracking] = useState(false);

  const trackPerformance = useCallback(async (event: PerformanceEvent) => {
    if (!isTracking) return;

    try {
      // Log performance data to debug logs
      await supabase
        .from('debug_logs')
        .insert({
          level: 'info',
          source: 'performance_tracking',
          message: `Performance event: ${event.type}`,
          data: {
            duration: event.duration,
            success: event.success,
            metadata: event.metadata,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }, [isTracking]);

  const trackLanguageSwitch = useCallback(async (startTime: number, success: boolean, language: string) => {
    const duration = performance.now() - startTime;
    await trackPerformance({
      type: 'language_switch',
      duration,
      success,
      metadata: { language }
    });
  }, [trackPerformance]);

  const trackAIGeneration = useCallback(async (startTime: number, success: boolean, section?: string) => {
    const duration = performance.now() - startTime;
    await trackPerformance({
      type: 'ai_generation',
      duration,
      success,
      metadata: { section }
    });
  }, [trackPerformance]);

  const trackEdgeFunctionCall = useCallback(async (startTime: number, success: boolean, functionName: string) => {
    const duration = performance.now() - startTime;
    await trackPerformance({
      type: 'edge_function_call',
      duration,
      success,
      metadata: { functionName }
    });
  }, [trackPerformance]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  return {
    trackLanguageSwitch,
    trackAIGeneration,
    trackEdgeFunctionCall,
    startTracking,
    stopTracking,
    isTracking
  };
}