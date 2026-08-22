const VERSION = "grouppix-v8";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isCacheableAsset(url, request)) {
    event.respondWith(cacheFirst(request));
  }
});

function isCacheableAsset(url, request) {
  if (url.origin === self.location.origin) {
    return (
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/images/") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg")
    );
  }

  const dest = request.destination;
  return dest === "image" || dest === "video";
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(VERSION);
    cache.put(request, fresh.clone());
    if (fresh.ok) cache.put("/index.html", fresh.clone());
    return fresh;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match("/index.html")) ||
      (await caches.match("/")) ||
      new Response("<!doctype html><title>Grouppix</title><p>Open the QR once before you lose signal.</p>", {
        headers: { "content-type": "text/html" },
      })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok || fresh.type === "opaque") {
      const cache = await caches.open(VERSION);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return new Response("", { status: 503, statusText: "offline" });
  }
}
