const CACHE_NAME = "turegalo-cache-v4"; // Subimos versión para forzar actualización

// Usamos rutas relativas para que funcione en cualquier carpeta
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./main.js",
  "./modules/utils.js",
  "./data.json",
  "./modules/uiManager.js",
  "./modules/audioManager.js",
  "./modules/gameEngine.js",

  // Audio (verifica que estas carpetas existan en relación al index.html)
  "assets/audio/correct.mp3",
  "assets/audio/incorrect.mp3",
  // ... añade aquí el resto de tus archivos de música usando rutas relativas ...
  
  // Imágenes
  "assets/images/moon.png"
  // ... añade el resto de imágenes ...
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});
      return cachedResponse || fetchPromise;
    })
  );
});
