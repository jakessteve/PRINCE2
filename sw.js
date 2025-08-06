const CACHE_NAME = 'prince2-quiz-v1';
const DATA_CACHE_NAME = 'prince2-quiz-data-v1';
const OFFLINE_CACHE_NAME = 'prince2-quiz-offline-v1';

// Cache URLs for static assets (cache-first strategy)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/js/main.js',
  '/js/constants.js',
  '/js/utils/array-utils.js',
  '/js/modules/dom-utils.js',
  '/js/modules/event-binder.js',
  '/js/modules/event-manager.js',
  '/js/modules/quiz-manager.js',
  '/js/modules/results.js',
  '/js/modules/timer.js',
  '/js/modules/ui-updater.js',
  '/js/services/cache-service.js',
  '/js/services/data-service.js',
  '/js/services/storage-service.js',
  '/js/store/index.js',
  '/data/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap'
];

// Cache URLs for quiz data (network-first strategy)
const DATA_CACHE_URLS = [
  '/data/json/week-1.json',
  '/data/json/week-2.json',
  '/data/json/week-3.json',
  '/data/json/week-4.json',
  '/data/json/week-5.json',
  '/data/json/week-6.json',
  '/data/json/week-7.json',
  '/data/json/week-8.json',
  '/data/json/week-9.json',
  '/data/json/week-10.json',
  '/data/json/week-11.json',
  '/data/json/week-12.json',
  '/data/json/week-13.json',
  '/data/json/week-14.json',
  '/data/json/week-15.json',
  '/data/json/week-16.json',
  '/data/quiz_bank_bundled.js',
  '/data/quiz_bank_final.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        // Cache URLs individually with better error handling
        const cachePromises = STATIC_CACHE_URLS.map(url => {
          return fetch(url, { method: 'HEAD' })
            .then(() => {
              return cache.add(url);
            })
            .catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
              // Don't reject the entire cache operation if one URL fails
              return Promise.resolve();
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
        // Continue with service worker activation even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME && cacheName !== OFFLINE_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Old caches deleted');
      return self.clients.claim();
    })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { url } = event.request;
  const isSameOrigin = new URL(url).origin === self.location.origin;
  
  // Skip non-GET requests and cross-origin requests
  if (event.request.method !== 'GET' || !isSameOrigin) {
    return;
  }

  // Handle API requests for quiz data (network-first strategy)
  if (url.includes('/data/json/') || url.includes('/data/quiz_bank_')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Cache the response for future use
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // If network fails, try to serve from cache
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  // Handle static assets (cache-first strategy)
  if (STATIC_CACHE_URLS.some(staticUrl => url.includes(staticUrl.replace(/^\//, '')))) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Handle other requests (network-first with cache fallback)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});

// Background sync for offline quiz submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quiz-results') {
    event.waitUntil(syncQuizResults());
  }
});

// Handle push notifications for offline alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/data:,',
      badge: '/data:,',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('PRINCE2 Quiz', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Sync quiz results when back online
async function syncQuizResults() {
  try {
    const pendingResults = await getPendingQuizResults();
    
    if (pendingResults.length > 0) {
      for (const result of pendingResults) {
        try {
          await submitQuizResult(result);
          await removePendingQuizResult(result.id);
        } catch (error) {
          console.error('Failed to sync quiz result:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error syncing quiz results:', error);
  }
}

// Helper functions for offline quiz management using Cache API
async function getPendingQuizResults() {
  try {
    const cache = await caches.open('prince2-quiz-pending-results');
    const results = await cache.match('pendingQuizResults');
    return results ? results.json() : [];
  } catch (error) {
    console.error('Failed to get pending quiz results:', error);
    return [];
  }
}

async function removePendingQuizResult(resultId) {
  try {
    const results = await getPendingQuizResults();
    const filteredResults = results.filter(result => result.id !== resultId);
    const cache = await caches.open('prince2-quiz-pending-results');
    await cache.put('pendingQuizResults', new Response(JSON.stringify(filteredResults)));
  } catch (error) {
    console.error('Failed to remove pending quiz result:', error);
  }
}

async function submitQuizResult(result) {
  // This would typically send the result to a server
  // For now, we'll just log it
  console.log('Submitting quiz result:', result);
}

// Handle offline detection
self.addEventListener('online', () => {
  console.log('Service Worker: Online');
  // Trigger background sync when back online
  self.registration.sync.register('sync-quiz-results');
});

self.addEventListener('offline', () => {
  console.log('Service Worker: Offline');
});

// Handle message events from the main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_QUIZ_DATA':
      // Cache quiz data for offline use
      caches.open(OFFLINE_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching quiz data', data.urls);
        // Cache URLs individually with better error handling
        const cachePromises = data.urls.map(url => {
          return fetch(url, { method: 'HEAD' })
            .then(response => {
              if (!response.ok) {
                console.warn(`URL not accessible, skipping cache: ${url} (Status: ${response.status})`);
                return Promise.resolve();
              }
              return cache.add(url);
            })
            .catch(error => {
              console.warn(`Failed to cache quiz data ${url}:`, error);
              // Don't reject the entire cache operation if one URL fails
              return Promise.resolve();
            });
        });
        return Promise.all(cachePromises);
      }).catch(error => {
        console.error('Service Worker: Failed to cache quiz data:', error);
      });
      break;
      
    case 'GET_OFFLINE_STATUS':
      // Return offline status
      event.ports[0].postMessage({
        isOffline: !navigator.onLine
      });
      break;
      
    case 'STORE_QUIZ_STATE':
      // Store quiz state for offline recovery
      try {
        const cache = await caches.open('prince2-quiz-states');
        await cache.put('offlineQuizState', new Response(JSON.stringify(data)));
      } catch (error) {
        console.error('Failed to store quiz state:', error);
      }
      break;
      
    case 'GET_QUIZ_STATE':
      // Retrieve stored quiz state
      try {
        const cache = await caches.open('prince2-quiz-states');
        const response = await cache.match('offlineQuizState');
        const state = response ? await response.json() : null;
        event.ports[0].postMessage({
          state: state
        });
      } catch (error) {
        console.error('Failed to get quiz state:', error);
        event.ports[0].postMessage({
          state: null
        });
      }
      break;
  }
});