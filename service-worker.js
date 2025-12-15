const CACHE_NAME = "hazielith-cache-v2"; // Incrementé la versión para forzar actualización

// Rutas relativas para evitar problemas de carpetas
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./main.js",
  "./modules/utils.js",
  "./modules/data.js",
  "./modules/audioManager.js",
  "./modules/uiManager.js",
  "./modules/gameEngine.js",
  
  // Assets críticos (Asegúrate que existan)
  "assets/images/moon.png",
  "assets/audio/correct.mp3",
  "assets/audio/incorrect.mp3"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Estrategia: Cache primero, luego red (y actualiza caché)
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si falla fetch y no hay caché, podrías retornar una página offline aquí
      });

      return cachedResponse || fetchPromise;
    })
  );
});
