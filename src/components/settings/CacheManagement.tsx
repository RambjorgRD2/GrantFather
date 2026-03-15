import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useServiceWorkerCache } from '@/hooks/useServiceWorker';
import { RefreshCw, Trash2, HardDrive, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DevModeManager } from './DevModeManager';
import { clearAuthCache } from '@/providers/AuthProvider';

export function CacheManagement() {
  const {
    clearStaticCache,
    clearAllCaches,
    forceReload,
    getCacheInfo,
    getServiceWorkerInfo,
    isClearing,
    cacheInfo,
  } = useServiceWorkerCache();

  const { toast } = useToast();
  const [swInfo, setSwInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCacheInfo();
    loadServiceWorkerInfo();
  }, []);

  const loadCacheInfo = async () => {
    setIsLoading(true);
    try {
      await getCacheInfo();
    } catch (error) {
      console.error('Failed to load cache info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadServiceWorkerInfo = async () => {
    try {
      const info = await getServiceWorkerInfo();
      setSwInfo(info);
    } catch (error) {
      console.error('Failed to load service worker info:', error);
    }
  };

  const handleClearStaticCache = async () => {
    try {
      const success = await clearStaticCache();
      if (success) {
        toast({
          title: 'Cache Cleared',
          description: 'Static asset cache has been cleared successfully.',
        });
        await loadCacheInfo();
      } else {
        toast({
          title: 'Cache Clear Failed',
          description: 'Failed to clear static cache. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while clearing cache.',
        variant: 'destructive',
      });
    }
  };

  const handleClearAllCaches = async () => {
    try {
      // Clear auth cache first
      clearAuthCache();
      
      // Then clear service worker caches
      const success = await clearAllCaches();
      if (success) {
        toast({
          title: 'All Caches Cleared',
          description: 'All caches including auth cache have been cleared successfully.',
        });
        await loadCacheInfo();
      } else {
        toast({
          title: 'Cache Clear Failed',
          description: 'Failed to clear all caches. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while clearing caches.',
        variant: 'destructive',
      });
    }
  };

  const handleClearAuthCache = () => {
    clearAuthCache();
    toast({
      title: 'Auth Cache Cleared',
      description: 'Authentication cache has been cleared. Please refresh to reload data.',
    });
  };

  const handleForceReload = async () => {
    try {
      await forceReload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while reloading.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Cache Management
        </CardTitle>
        <CardDescription>
          Manage application cache and service worker settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Worker Information */}
        {swInfo && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Service Worker Status
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Version:</span>
                <Badge variant="outline" className="ml-2">
                  {swInfo.version}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Environment:</span>
                <Badge
                  variant={swInfo.isDevelopment ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {swInfo.isDevelopment ? 'Development' : 'Production'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Cache Information */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Cache Information
          </h4>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading cache info...
            </div>
          ) : cacheInfo ? (
            <div className="space-y-2">
              {cacheInfo.map((cache: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{cache.name}</span>
                  <Badge variant="outline">{cache.size} items</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No cache information available
            </div>
          )}
        </div>

        <Separator />

        {/* Cache Actions */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Cache Actions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={handleClearAuthCache}
              disabled={isClearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Auth Cache
            </Button>
            <Button
              variant="outline"
              onClick={handleClearStaticCache}
              disabled={isClearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Static Cache
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAllCaches}
              disabled={isClearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Caches
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceReload}
              disabled={isClearing}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Force Reload
            </Button>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={loadCacheInfo}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh Info
          </Button>
        </div>
      </CardContent>
    </Card>
    <DevModeManager />
    </>
  );
}
