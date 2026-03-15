import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Trash2, 
  Bug, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CacheInfo {
  orgCacheSize: number;
  failedFetchesSize: number;
  circuitBreakerActive: boolean;
  circuitBreakerTimeRemaining?: number;
}

export function AuthDebugPanel() {
  const auth = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    orgCacheSize: 0,
    failedFetchesSize: 0,
    circuitBreakerActive: false,
  });

  // Only show in development or when dev mode is enabled
  useEffect(() => {
    const devMode = localStorage.getItem('devMode') === 'true';
    const isDevelopment = import.meta.env.MODE === 'development';
    setIsVisible(devMode || isDevelopment);
  }, []);

  // Update cache info periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateCacheInfo = () => {
      // This is a debug panel, so we'll extract info from localStorage
      const orgCacheKeys = Object.keys(localStorage).filter(k => k.startsWith('org_cache_'));
      const failedKeys = Object.keys(localStorage).filter(k => k.startsWith('failed_fetch_'));
      
      // Check circuit breaker status
      const lastFailure = localStorage.getItem('last_org_fetch_failure');
      const circuitBreakerActive = lastFailure ? 
        (Date.now() - parseInt(lastFailure)) < 10000 : false;
      const timeRemaining = lastFailure ? 
        Math.max(0, 10 - Math.floor((Date.now() - parseInt(lastFailure)) / 1000)) : 0;

      setCacheInfo({
        orgCacheSize: orgCacheKeys.length,
        failedFetchesSize: failedKeys.length,
        circuitBreakerActive,
        circuitBreakerTimeRemaining: timeRemaining,
      });
    };

    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const handleClearCache = async () => {
    try {
      // Clear organization cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('org_cache_') || key.startsWith('failed_fetch_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem('last_org_fetch_failure');

      // Trigger refetch
      await auth.refetchOrganization();

      toast({
        title: 'Cache Cleared',
        description: 'Organization cache has been cleared and data refetched.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear cache. Please refresh the page.',
        variant: 'destructive',
      });
    }
  };

  const handleForceRefetch = async () => {
    try {
      await auth.refetchOrganization();
      toast({
        title: 'Refetch Complete',
        description: 'Organization data has been refetched.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refetch data.',
        variant: 'destructive',
      });
    }
  };

  const handleResetCircuitBreaker = () => {
    localStorage.removeItem('last_org_fetch_failure');
    setCacheInfo(prev => ({ ...prev, circuitBreakerActive: false }));
    toast({
      title: 'Circuit Breaker Reset',
      description: 'You can now retry fetching organization data.',
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Auth Debug Panel
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Authentication State */}
          <div>
            <div className="font-medium mb-2">Authentication State</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User:</span>
                {auth.user ? (
                  <CheckCircle className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Session:</span>
                {auth.session ? (
                  <CheckCircle className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Loading:</span>
                <Badge variant={auth.loading ? 'default' : 'outline'} className="h-5">
                  {auth.loading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Auth Checked:</span>
                <Badge variant={auth.authChecked ? 'default' : 'outline'} className="h-5">
                  {auth.authChecked ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Organization State */}
          <div>
            <div className="font-medium mb-2">Organization State</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Has Org:</span>
                {auth.hasOrganization ? (
                  <CheckCircle className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Needs Onboarding:</span>
                <Badge 
                  variant={auth.needsOnboarding ? 'destructive' : 'outline'} 
                  className="h-5"
                >
                  {auth.needsOnboarding ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Org Loading:</span>
                <Badge variant={auth.orgLoading ? 'default' : 'outline'} className="h-5">
                  {auth.orgLoading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline" className="h-5">
                  {auth.userRole?.role || 'None'}
                </Badge>
              </div>
            </div>
            {auth.organization && (
              <div className="mt-2 text-muted-foreground">
                Org: {auth.organization.name}
              </div>
            )}
          </div>

          <Separator />

          {/* Cache State */}
          <div>
            <div className="font-medium mb-2">Cache State</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Org Cache Size:</span>
                <Badge variant="outline" className="h-5">
                  {cacheInfo.orgCacheSize}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Failed Fetches:</span>
                <Badge variant="outline" className="h-5">
                  {cacheInfo.failedFetchesSize}
                </Badge>
              </div>
              {cacheInfo.circuitBreakerActive && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Circuit Breaker Active ({cacheInfo.circuitBreakerTimeRemaining}s)</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="w-full flex items-center gap-2"
            >
              <Trash2 className="h-3 w-3" />
              Clear Cache & Refetch
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefetch}
              className="w-full flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Force Refetch
            </Button>
            {cacheInfo.circuitBreakerActive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetCircuitBreaker}
                className="w-full flex items-center gap-2"
              >
                <Clock className="h-3 w-3" />
                Reset Circuit Breaker
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
