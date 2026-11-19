// Marginalia service worker v1.
// Own-origin GET: network first, fall back to the cached index.html.
// Firebase SDK scripts (versioned gstatic URLs): cache first, so the app can start offline.
// Never touches Firebase data/login traffic or any other site.
const CACHE = "marginalia-shell-v1";
const SDK_CACHE = "marginalia-sdk-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("marginalia-") && k !== CACHE && k !== SDK_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch (e) {
        const c = await caches.open(CACHE);
        return (await c.match(req)) || (await c.match("index.html")) || (await c.match("./")) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/") && url.pathname.endsWith(".js")) {
    event.respondWith((async () => {
      const c = await caches.open(SDK_CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) c.put(req, res.clone());
      return res;
    })());
  }
});
