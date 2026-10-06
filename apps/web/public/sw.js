// Keeps the event-day page usable without a connection. Only that page and the app's static files
// are cached; everything else always goes to the network. Signing out clears the cache.
const CACHE = "ie-live-v1";
const LIVE_PAGE = /^\/pro\/eventi\/[0-9a-f-]{36}\/live$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Static files have content hashes in their names: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // The event-day page: always fresh when online, the last copy when offline.
  if (request.mode === "navigate" && LIVE_PAGE.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) ?? Response.error()),
    );
  }
});
