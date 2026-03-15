import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceMetrics {
  edgeFunctionLatency: number;
  languageSwitchTime: number;
  aiGenerationSuccess: number;
  lastUpdated: string;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    edgeFunctionLatency: 0,
    languageSwitchTime: 0,
    aiGenerationSuccess: 0,
    lastUpdated: new Date().toISOString()
  });

  useEffect(() => {
    // Monitor performance metrics
    const monitorPerformance = () => {
      // Track navigation timing
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const edgeLatency = navigationEntry?.loadEventEnd || 0;
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        edgeFunctionLatency: edgeLatency,
        lastUpdated: new Date().toISOString()
      }));
    };

    monitorPerformance();
    const interval = setInterval(monitorPerformance, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusVariant = (metric: number, threshold: number): "default" | "secondary" | "destructive" | "outline" => {
    if (metric === 0) return 'secondary';
    return metric < threshold ? 'default' : 'destructive';
  };

  const getSuccessVariant = (successRate: number): "default" | "secondary" | "destructive" | "outline" => {
    return successRate > 85 ? 'default' : 'destructive';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Performance Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Edge Functions</span>
          <Badge variant={getStatusVariant(metrics.edgeFunctionLatency, 2000)}>
            {metrics.edgeFunctionLatency}ms
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Language Switch</span>
          <Badge variant={getStatusVariant(metrics.languageSwitchTime, 500)}>
            {metrics.languageSwitchTime}ms
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">AI Success Rate</span>
          <Badge variant={getSuccessVariant(metrics.aiGenerationSuccess)}>
            {metrics.aiGenerationSuccess}%
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}