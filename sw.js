// Service Worker - Área II Cartagena PWA
const CACHE_NAME = 'area2-cartagena-v1';
const OFFLINE_URL = '/Cartagenaeste/notebook-local.html';

// Core files to cache on install
const PRECACHE_URLS = [
  '/Cartagenaeste/notebook-local.html',
  '/Cartagenaeste/manifest.json',
  '/Cartagenaeste/icons/icon-192x192.png',
  '/Cartagenaeste/icons/icon-512x512.png'
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

// Fetch: Network-first strategy with cache fallback
self.addEventListener('fetch', event => {
  const request = event.request;

  // Skip non-GET, chrome-extension, and API calls
  if (request.method !== 'GET') return;
  if (request.url.includes('firebaseio.com')) return;
  if (request.url.includes('googleapis.com')) return;
  if (request.url.includes('groq.com')) return;
  if (request.url.includes('chrome-extension')) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: try cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // If navigating, show offline page
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
