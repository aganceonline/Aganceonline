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
  './js/admin.js',
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
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Supabase API calls (queries) from caching to ensure fresh data
  // but allow caching of the Supabase library script if it's served from a CDN (handled below).
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1')) {
      return; // Bypass SW for Supabase API
  }

  // Bypass for Chrome Extensions and GTM
  if (url.protocol === 'chrome-extension:' || url.hostname.includes('googletagmanager.com')) {
      return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            // Update cache with fresh version
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            } else if (networkResponse && networkResponse.status === 200 && (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com'))) {
              // Cache external assets as well
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            return cachedResponse;
          });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
