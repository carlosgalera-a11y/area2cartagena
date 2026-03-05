// Service Worker - Área II Cartagena PWA v4 (Netlify)
const CACHE_NAME = 'area2-cartagena-v4';
const OFFLINE_URL = '/notebook-local.html';

const PRECACHE_URLS = [
  '/notebook-local.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-96x96.png'
];

// Install: precache + force activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: DELETE ALL old caches (v2, v3 with wrong /Cartagenaeste/ paths)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW v4] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for HTML, Cache-first for assets
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.url.includes('firebaseio.com')) return;
  if (request.url.includes('googleapis.com')) return;
  if (request.url.includes('groq.com')) return;
  if (request.url.includes('chrome-extension')) return;
  if (request.url.includes('gstatic.com')) return;
  if (request.url.includes('cartagenaeste.es/wp-json')) return;

  // HTML: network-first
  if (request.mode === 'navigate' || request.url.endsWith('.html')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then(c => c || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // PDFs/images: cache-first
  if (request.url.match(/\.(pdf|png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.match(request).then(c => c || new Response('Offline', {status: 503})))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
