const CACHE_NAME = 'agance-online-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './inventory.html',
  './details.html',
  './contact.html',
  './favorites.html',
  './financing.html',
  './admin.html',
  './css/style.css',
  './js/script.js',
  './js/supabase-config.js',
  './js/holidays.js',
  './js/utils.js',
  './data/translations.json',
  './assets/images/logo.jpeg',
  './assets/images/map-bg.jpg',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install Event - Pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip supabase and gtm for caching if they are dynamic,
  // but we included the library CDN in ASSETS_TO_CACHE for offline use.

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If fetch fails and we have no cached response,
            // the promise will resolve to undefined, which we handle below.
            return cachedResponse;
          });

        // Return the cached response if we have it, otherwise wait for the network
        // If both are missing/fail, the browser will receive a network error which is expected.
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
