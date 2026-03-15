import { useEffect, useState, useCallback, useRef } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface UseServiceWorkerOptions {
  scriptURL?: string;
  scope?: string;
  onUpdateFound?: () => void;
  onUpdateReady?: () => void;
  onUpdateInstalled?: () => void;
  onError?: (error: Error) => void;
  autoUpdate?: boolean;
  skipWaiting?: boolean;
}

export function useServiceWorker(options: UseServiceWorkerOptions = {}): ServiceWorkerState & {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  sendMessage: (message: any) => Promise<void>;
} {
  const {
    scriptURL = '/sw.js',
    scope = '/',
    onUpdateFound,
    onUpdateReady,
    onUpdateInstalled,
    onError,
    autoUpdate = true,
    skipWaiting: autoSkipWaiting = false,
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    registration: null,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateFoundRef = useRef(false);

  // Check if service worker is supported
  useEffect(() => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Service Worker not supported' }));
    }
  }, [state.isSupported]);

  // Register service worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      throw new Error('Service Worker not supported');
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      const registration = await (navigator.serviceWorker as ServiceWorkerContainer).register(scriptURL, { scope });
      registrationRef.current = registration;

      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration,
      }));

      // Set up event listeners
      setupEventListeners(registration);

      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(error as Error);
      console.error('Service Worker registration failed:', error);
    }
  }, [state.isSupported, scriptURL, scope, onError]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (!registrationRef.current) {
      throw new Error('No Service Worker registered');
    }

    try {
      const unregistered = await registrationRef.current.unregister();
      
      if (unregistered) {
        setState(prev => ({
          ...prev,
          isRegistered: false,
          registration: null,
        }));
        registrationRef.current = null;
        console.log('Service Worker unregistered successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('Service Worker unregistration failed:', error);
    }
  }, []);

  // Update service worker
  const update = useCallback(async () => {
    if (!registrationRef.current) {
      throw new Error('No Service Worker registered');
    }

    try {
      await registrationRef.current.update();
      console.log('Service Worker update requested');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('Service Worker update failed:', error);
    }
  }, []);

  // Skip waiting (activate new service worker)
  const skipWaiting = useCallback(async () => {
    if (!registrationRef.current?.waiting) {
      throw new Error('No waiting Service Worker');
    }

    try {
      // Send message to waiting service worker
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to activate
      await new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      });

      console.log('Service Worker skip waiting completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('Service Worker skip waiting failed:', error);
    }
  }, []);

  // Send message to service worker
  const sendMessage = useCallback(async (message: any) => {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active Service Worker controller');
    }

    try {
      const response = await navigator.serviceWorker.controller.postMessage(message);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error('Failed to send message to Service Worker:', error);
      throw error;
    }
  }, []);

  // Set up event listeners for service worker
  const setupEventListeners = useCallback((registration: ServiceWorkerRegistration) => {
    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      console.log('Service Worker update found');
      updateFoundRef.current = true;
      onUpdateFound?.();

      const newWorker = registration.installing;
      if (!newWorker) return;

      setState(prev => ({ ...prev, isInstalling: true }));

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          console.log('Service Worker installed');
          setState(prev => ({ ...prev, isInstalling: false }));
          onUpdateInstalled?.();

          if (navigator.serviceWorker.controller) {
            setState(prev => ({ ...prev, isWaiting: true }));
            onUpdateReady?.();

            if (autoSkipWaiting) {
              skipWaiting();
            }
          }
        } else if (newWorker.state === 'activated') {
          console.log('Service Worker activated');
          setState(prev => ({ 
            ...prev, 
            isInstalling: false, 
            isWaiting: false,
            isActive: true 
          }));
        }
      });
    });

    // Handle service worker state changes
    if (registration.installing) {
      setState(prev => ({ ...prev, isInstalling: true }));
    } else if (registration.waiting) {
      setState(prev => ({ ...prev, isWaiting: true }));
    } else if (registration.active) {
      setState(prev => ({ ...prev, isActive: true }));
    }

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed');
      setState(prev => ({ 
        ...prev, 
        isWaiting: false,
        isActive: true 
      }));
    });
  }, [onUpdateFound, onUpdateInstalled, onUpdateReady, autoSkipWaiting, skipWaiting]);

  // Auto-register service worker on mount
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      register();
    }
  }, [state.isSupported, state.isRegistered, register]);

  // Auto-update service worker
  useEffect(() => {
    if (autoUpdate && registrationRef.current) {
      const interval = setInterval(() => {
        registrationRef.current?.update();
      }, 60000); // Check for updates every minute

      return () => clearInterval(interval);
    }
  }, [autoUpdate]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    sendMessage,
  };
}

/**
 * Hook for managing Service Worker cache - Enhanced with better cache management
 */
export const useServiceWorkerCache = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  
  /**
   * Get comprehensive cache information
   */
  const getCacheInfo = useCallback(async () => {
    if (!('caches' in window) || !navigator.serviceWorker.controller) {
      return null;
    }

    try {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        const response = event.data;
        if (response && response.cacheInfo) {
          setCacheInfo(response.cacheInfo);
          resolve(response.cacheInfo);
        } else {
          resolve(null);
        }
      };
      
      navigator.serviceWorker.controller?.postMessage({ 
        type: 'GET_CACHE_INFO' 
      }, [messageChannel.port2]);
    });
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return null;
    }
  }, []);

  /**
   * Clear only static asset caches (CSS, JS, images)
   * Dynamic content is never cached in the new approach
   */
  const clearStaticCache = useCallback(async () => {
    if (!('caches' in window) || !navigator.serviceWorker.controller) {
      return false;
    }

    setIsClearing(true);
    try {
      // Try to use service worker message first
      await navigator.serviceWorker.controller.postMessage({ 
        type: 'CLEAR_STATIC_CACHE' 
      });
      
      // Fallback to direct cache clearing
      const cacheNames = await caches.keys();
      const staticCaches = cacheNames.filter(name => name.includes('grantfather-static'));
      
      await Promise.all(
        staticCaches.map(cacheName => {
          console.log('Clearing static cache:', cacheName);
          return caches.delete(cacheName);
        })
      );

      console.log('Static caches cleared successfully');
      await getCacheInfo(); // Refresh cache info
      return true;
    } catch (error) {
      console.error('Failed to clear static caches:', error);
      return false;
    } finally {
      setIsClearing(false);
    }
  }, [getCacheInfo]);

  /**
   * Clear all caches including dynamic ones
   */
  const clearAllCaches = useCallback(async () => {
    if (!('caches' in window) || !navigator.serviceWorker.controller) {
      return false;
    }

    setIsClearing(true);
    try {
      // Try to use service worker message first
      await navigator.serviceWorker.controller.postMessage({ 
        type: 'CLEAR_CACHE' 
      });
      
      // Fallback to direct cache clearing
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );

      console.log('All caches cleared successfully');
      await getCacheInfo(); // Refresh cache info
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    } finally {
      setIsClearing(false);
    }
  }, [getCacheInfo]);

  /**
   * Force a complete page reload with cache clearing
   * For resolving persistent issues
   */
  const forceReload = useCallback(async () => {
    setIsClearing(true);
    try {
      await clearAllCaches();
      // Clear browser cache as well
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      // Hard refresh without cache using timestamp
      const url = new URL(window.location.href);
      url.searchParams.set('_cachebuster', Date.now().toString());
      window.location.href = url.toString();
    } catch (error) {
      console.error('Force reload failed:', error);
      // Fallback to regular reload
      window.location.reload();
    } finally {
      setIsClearing(false);
    }
  }, [clearAllCaches]);

  /**
   * Navigate with cache busting to force fresh page load
   */
  const navigateWithCacheBusting = useCallback((path: string) => {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('_nocache', Date.now().toString());
    window.location.href = url.toString();
  }, []);

  /**
   * Get service worker version and status
   */
  const getServiceWorkerInfo = useCallback(async () => {
    if (!navigator.serviceWorker.controller) {
      return null;
    }

    try {
      const response = await navigator.serviceWorker.controller.postMessage({ 
        type: 'GET_VERSION' 
      });
      return response;
    } catch (error) {
      console.error('Failed to get service worker info:', error);
      return null;
    }
  }, []);

  return {
    clearStaticCache,
    clearAllCaches,
    forceReload,
    getCacheInfo,
    getServiceWorkerInfo,
    isClearing,
    cacheInfo,
    navigateWithCacheBusting
  };
};

// Hook for checking if app is offline
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

// Hook for checking service worker update status
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  const { registration } = useServiceWorker({
    onUpdateFound: () => setUpdateAvailable(true),
    onUpdateReady: () => setUpdateReady(true),
  });

  const applyUpdate = useCallback(async () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  return {
    updateAvailable,
    updateReady,
    applyUpdate,
  };
}

// Hook for background sync
export function useBackgroundSync() {
  const { registration, sendMessage } = useServiceWorker();

  const syncInBackground = useCallback(async (tag: string, data?: any) => {
    if (!registration || !('sync' in window)) {
      throw new Error('Background Sync not supported');
    }

    try {
      await (registration as any).sync?.register(tag);
      
      if (data) {
        // Store data for background sync
        // This would typically use IndexedDB
        console.log('Background sync registered with data:', data);
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
      throw error;
    }
  }, [registration]);

  return {
    syncInBackground,
    sendMessage,
  };
}
