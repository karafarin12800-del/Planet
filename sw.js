const CACHE_NAME = "planet-pwa-v43-organism-morphology-diversity";
const APP_SHELL = ["./index.html", "./offline-evolution.js", "./planet-autonomous-evolution.js", "./planet-collection-commerce.js", "./planet-commerce-client.js", "./planet-commerce-ui.js", "./planet-galaxy-engine.js", "./planet-world-state.js", "./planet-galaxy-viewer.js", "./planet-genome-game.js", "./planet-localization.js", "./evolution-engine.js", "./procedural-organism-3d.js", "./planet-organism-morphology.js", "./planet-image-generation.js", "./offline-ai.js", "./manifest.webmanifest", "./icon.svg", "./privacy.html", "./genome-evidence.html", "./cosmology-lab.html", "./cosmology-observations.js"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match("./index.html"))));
});