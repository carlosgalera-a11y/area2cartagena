// Service Worker - Área II Cartagena PWA v2
const CACHE_NAME = 'area2-cartagena-v2';
const OFFLINE_URL = '/Cartagenaeste/notebook-local.html';

// Core files to cache on install
const PRECACHE_URLS = [
  '/Cartagenaeste/notebook-local.html',
  '/Cartagenaeste/manifest.json',
  '/Cartagenaeste/icons/icon-192x192.png',
  '/Cartagenaeste/icons/icon-512x512.png',
  '/Cartagenaeste/icons/icon-96x96.png'
];

// Install: precache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first with cache fallback
self.addEventListener('fetch', event => {
  const request = event.request;

  // Skip non-GET, APIs, extensions
  if (request.method !== 'GET') return;
  if (request.url.includes('firebaseio.com')) return;
  if (request.url.includes('googleapis.com')) return;
  if (request.url.includes('groq.com')) return;
  if (request.url.includes('chrome-extension')) return;
  if (request.url.includes('gstatic.com')) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// Background Sync: retry failed requests when back online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Notify clients that sync is available
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_COMPLETE' });
        });
      })
    );
  }
});

// Periodic Background Sync: check for updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-check') {
    event.waitUntil(
      fetch('/Cartagenaeste/notebook-local.html', { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            return caches.open(CACHE_NAME).then(cache => {
              return cache.put('/Cartagenaeste/notebook-local.html', response);
            });
          }
        })
        .catch(() => { /* offline, skip */ })
    );
  }
});

// Push notifications placeholder (for future use)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Área II Cartagena', {
        body: data.body || 'Nueva actualización disponible',
        icon: '/Cartagenaeste/icons/icon-192x192.png',
        badge: '/Cartagenaeste/icons/icon-96x96.png',
        tag: 'area2-notification'
      })
    );
  }
});

// Notification click: open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/Cartagenaeste/notebook-local.html');
    })
  );
});
