const CACHE_NAME = 'grammar-gym-v1';
const ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/manifest.json',
  '/static/icon-192.png'
];

// Install Event: Cache Static Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching shell assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch Event: Cache First for Assets, Network First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Create a custom response for the root URL to handle SPA-like behavior if needed (but currently we serve index.html at /)
  // For API calls, go to network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Optional: Return fallback JSON or custom offline error for API
        return new Response(JSON.stringify({ error: "Offline" }), { 
            headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then(response => {
        // Dynamically cache other static visits? Maybe not for now to keep it simple.
        return response;
      });
    })
  );
});
