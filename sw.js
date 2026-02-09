
const CACHE_NAME = 'tehillim-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&family=Heebo:wght@100;300;400;500;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((response) => {
        // Cache external modules from esm.sh and fonts to make them available offline
        if (event.request.url.includes('esm.sh') || event.request.url.includes('gstatic') || event.request.url.includes('googleapis')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback for offline if not in cache and network fails
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
