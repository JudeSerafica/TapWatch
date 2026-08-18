// Service Worker for TapWatch PWA
const CACHE_NAME = 'tapwatch-v3';
const RUNTIME_CACHE = 'tapwatch-runtime-v3';

// Essential files to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/manifest.json'
];

// ── Dev mode guard ────────────────────────────────────────────────────────
// In development (localhost / 127.0.0.1) the service worker must do nothing.
// Activating the SW in dev causes ERR_CONNECTION_REFUSED white screens because
// the SW tries to cache Vite's internal assets and HMR requests.
const DEV_ORIGINS = ['http://localhost', 'http://127.0.0.1', 'http://0.0.0.0'];
const isDev = DEV_ORIGINS.some(o => self.location.origin.startsWith(o));

if (isDev) {
  // Immediately self-destruct — unregister so it never intercepts requests
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => {
    self.registration.unregister();
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.navigate(c.url))
    );
  });
} else {

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
  const url = event.request.url;

  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Vite HMR / dev-server internal requests
  if (url.includes('/@vite/') || url.includes('/@fs/') || url.includes('__vite') ||
      url.includes('?t=') || url.includes('hot-update') || url.includes('ws://') ||
      url.includes('wss://')) {
    return;
  }

  // Cache API only supports GET — let all other methods pass straight through
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid basic (same-origin) 200 responses
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
        // Network failed — try cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // Navigation requests → return the app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((shell) =>
              shell || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
            );
          }

          // For everything else return a proper empty 204 so the SW
          // doesn't throw "Failed to convert value to Response"
          return new Response('', { status: 204, statusText: 'No Content' });
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
  try {
    console.log('[SW] Starting incident sync...');
    
    // Open IndexedDB and get queued items
    const db = await openDB();
    const tx = db.transaction('incident-queue', 'readonly');
    const store = tx.objectStore('incident-queue');
    const index = store.index('synced');
    const items = await index.getAll(false);

    console.log(`[SW] Found ${items.length} queued incidents`);

    for (const item of items) {
      try {
        // Attempt to sync item
        const response = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          // Mark as synced
          const updateTx = db.transaction('incident-queue', 'readwrite');
          const updateStore = updateTx.objectStore('incident-queue');
          item.synced = true;
          item.syncedAt = new Date().toISOString();
          await updateStore.put(item);
          console.log('[SW] Successfully synced incident:', item.id);
        } else {
          console.warn('[SW] Sync failed with status:', response.status);
        }
      } catch (error) {
        console.error('[SW] Failed to sync item:', item.id, error);
      }
    }

    console.log('[SW] Incident sync complete');
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tapwatch-offline', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('incident-queue')) {
        const store = db.createObjectStore('incident-queue', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('type', 'type');
        store.createIndex('synced', 'synced');
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

} // end else (production only)