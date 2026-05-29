// Service Worker for TapWatch PWA
const CACHE_NAME = 'tapwatch-v2';
const RUNTIME_CACHE = 'tapwatch-runtime-v2';

// Essential files to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First, fallback to Cache strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone and cache the response
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Background Sync - for offline incident reports
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-incidents') {
    event.waitUntil(syncIncidents());
  }
});

async function syncIncidents() {
  console.log('Syncing incidents...');
}

// Push Notifications - for emergency alerts
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New incident alert',
    icon: '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'incident-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Incident'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TapWatch Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-incidents') {
    event.waitUntil(checkForNewIncidents());
  }
});

async function checkForNewIncidents() {
  console.log('Checking for new incidents...');
}
