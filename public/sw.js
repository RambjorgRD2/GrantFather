// GrantFather Service Worker - Enhanced for Development with Aggressive Cache Clearing
const BUILD_TIMESTAMP = Date.now();
const CACHE_VERSION = `v2024.08.26-${BUILD_TIMESTAMP}`;
const STATIC_CACHE = `grantfather-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `grantfather-dynamic-${CACHE_VERSION}`;

// Development cache-busting URLs to always bypass cache
const CACHE_BYPASS_PARAMS = ['_nocache', '_refresh', '_bypass', '_cachebuster'];
// PHASE 6: Critical routes that should bypass cache
const CRITICAL_ROUTES = [
  '/',
  '/applications',
  '/grants', 
  '/settings',
  '/dashboard',
  '/onboarding',
  '/login',
  '/register'
];

// PHASE 6: AI function paths that should always bypass cache
const AI_FUNCTION_PATHS = [
  '/functions/v1/ai-grant-writer',
  '/functions/v1/generate-suggestions',
];

// Only cache static assets - no dynamic content
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Will be populated with other static assets during install
];

// Files to cache first
const STATIC_FILE_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
];

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker version:', CACHE_VERSION);

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker version:', CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith('grantfather-') &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE
            ) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Service worker activated and claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - enhanced caching strategy with aggressive development bypass
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Helper function to determine if we're in development
  function isDevelopment() {
    return (
      self.location.hostname === 'localhost' ||
      self.location.hostname === '127.0.0.1' ||
      self.location.hostname.includes('.lovable.') ||
      self.location.port === '5173'
    ); // Vite default port
  }

  // Check for cache-busting parameters
  function hasCacheBusterParam(url) {
    return CACHE_BYPASS_PARAMS.some(param => url.searchParams.has(param));
  }

  // Check if this is a critical route that should bypass cache in development
  function isCriticalRoute(url) {
    return CRITICAL_ROUTES.some(route => url.pathname.startsWith(route));
  }

  // PHASE 6: Check if this is an AI function call that should always bypass cache
  function isAIFunctionCall(url) {
    return AI_FUNCTION_PATHS.some(path => url.pathname.includes(path));
  }

  // PHASE 6: Always bypass cache for AI function calls
  if (isAIFunctionCall(url)) {
    console.log('SW: Bypassing cache for AI function:', url.pathname);
    event.respondWith(networkOnlyStrategy(request));
    return;
  }

  // Force network-only for development with cache busters or critical routes
  if (isDevelopment() && (hasCacheBusterParam(url) || isCriticalRoute(url))) {
    console.log('SW: Bypassing cache for development route:', url.pathname);
    event.respondWith(networkOnlyStrategy(request));
    return;
  }

  // Cache static assets - use network-first for JS/CSS in development
  if (isStaticAsset(request)) {
    const isJSOrCSS =
      request.url.includes('.js') || request.url.includes('.css');

    if (isDevelopment() && isJSOrCSS) {
      event.respondWith(networkFirstStrategy(request));
    } else {
      event.respondWith(cacheFirstStrategy(request));
    }
    return;
  }

  // Everything else (API calls, dynamic pages) - always use network
  event.respondWith(networkOnlyStrategy(request));
});

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check if it's a static file extension
  return STATIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function cacheFirstStrategy(request) {
  return caches
    .open(STATIC_CACHE)
    .then((cache) => {
      return cache.match(request).then((response) => {
        if (response) {
          console.log('SW: Serving from cache:', request.url);
          return response;
        }

        console.log('SW: Fetching and caching:', request.url);
        return fetch(request).then((fetchResponse) => {
          // Only cache successful responses
          if (fetchResponse.status === 200) {
            cache.put(request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    })
    .catch(() => {
      // If cache fails, try network
      return fetch(request);
    });
}

function networkFirstStrategy(request) {
  return fetch(request)
    .then((response) => {
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    })
    .catch(() => {
      return caches.match(request);
    });
}

function networkOnlyStrategy(request) {
  return fetch(request).catch((error) => {
    console.log('SW: Network request failed:', request.url, error);
    throw error;
  });
}

// Enhanced cache management functions
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  console.log('SW: All caches cleared');
}

async function clearStaticCache() {
  await caches.delete(STATIC_CACHE);
  console.log('SW: Static cache cleared');
}

async function clearDynamicCache() {
  await caches.delete(DYNAMIC_CACHE);
  console.log('SW: Dynamic cache cleared');
}

// Handle background sync (simplified)
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync event:', event.tag);
  // Placeholder for future background sync functionality
});

// Handle push notifications (simplified)
self.addEventListener('push', (event) => {
  console.log('SW: Push event received');
  // Placeholder for future push notification functionality
});

// Handle notification clicks (simplified)
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification click event');
  event.notification.close();
  // Placeholder for future notification handling
});

// Enhanced message handling from main thread
self.addEventListener('message', async (event) => {
  console.log('SW: Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      buildTimestamp: BUILD_TIMESTAMP,
      isDevelopment:
        self.location.hostname === 'localhost' ||
        self.location.hostname === '127.0.0.1' ||
        self.location.hostname.includes('.lovable.') ||
        self.location.port === '5173',
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    await clearAllCaches();
    event.ports[0].postMessage({ success: true });
  }

  if (event.data && event.data.type === 'CLEAR_STATIC_CACHE') {
    await clearStaticCache();
    event.ports[0].postMessage({ success: true });
  }

  if (event.data && event.data.type === 'CLEAR_DYNAMIC_CACHE') {
    await clearDynamicCache();
    event.ports[0].postMessage({ success: true });
  }

  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    const cacheNames = await caches.keys();
    const cacheInfo = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        return { name, size: keys.length };
      })
    );
    event.ports[0].postMessage({ cacheInfo });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
});
