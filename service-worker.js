const CACHE_NAME = "secreto-cache-v3";
const FILES_TO_CACHE = [
  "./", "./index.html", "./style.css", "./main.js", "./manifest.json",
  "./modules/utils.js", "./modules/data.js", "./modules/uiManager.js", "./modules/audioManager.js", "./modules/gameEngine.js",
  "assets/images/moon.png", "assets/audio/correct.mp3", "assets/audio/incorrect.mp3"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(net => {
        if (net && net.status === 200 && net.type === 'basic') {
            const clone = net.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return net;
      }).catch(() => {});
      return cached || fetchPromise;
    })
  );
});
