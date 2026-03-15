import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useServiceWorkerCache } from '@/hooks/useServiceWorker';
import { AlertTriangle, RefreshCw, Trash2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DevModeManager() {
  const { 
    clearAllCaches, 
    forceReload, 
    navigateWithCacheBusting,
    isClearing,
    cacheInfo 
  } = useServiceWorkerCache();
  const { toast } = useToast();

  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('.lovable.');

  const handleClearCaches = async () => {
    try {
      await clearAllCaches();
      toast({
        title: "Caches Cleared",
        description: "All application caches have been cleared successfully.",
      });
    } catch (error) {
      toast({
        title: "Cache Clear Failed",
        description: "Failed to clear caches. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleForceReload = async () => {
    toast({
      title: "Force Reloading",
      description: "Clearing all caches and reloading with fresh data...",
    });
    await forceReload();
  };

  const handleNavigateWithCacheBust = (path: string) => {
    navigateWithCacheBusting(path);
  };

  if (!isDevelopment) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle>Development Mode</CardTitle>
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            DEV
          </Badge>
        </div>
        <CardDescription>
          Development tools for cache management and debugging double menu issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleClearCaches}
            disabled={isClearing}
            variant="outline"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear All Caches'}
          </Button>

          <Button
            onClick={handleForceReload}
            disabled={isClearing}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Reload
          </Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Navigation with Cache Busting</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleNavigateWithCacheBust('/applications')}
              size="sm"
              variant="ghost"
            >
              <Zap className="h-3 w-3 mr-1" />
              Applications
            </Button>
            <Button
              onClick={() => handleNavigateWithCacheBust('/grants')}
              size="sm"
              variant="ghost"
            >
              <Zap className="h-3 w-3 mr-1" />
              Grants
            </Button>
          </div>
        </div>

        {cacheInfo && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Cache Status</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              {cacheInfo.map((cache, index) => (
                <div key={index} className="flex justify-between">
                  <span>{cache.name}</span>
                  <span>{cache.size} items</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}