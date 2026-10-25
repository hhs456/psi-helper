const CACHE_NAME = "psi-helper-v4";

const STATIC_ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function isCacheable(response) {
  const contentType = response.headers.get("content-type") || "";
  return (
    response.ok && response.type === "basic" && !contentType.includes("text/html")
  );
}

async function putSafe(cache, request, response) {
  try {
    await cache.put(request, response.clone());
  } catch {
    // 無法寫入時直接忽略，不影響已回傳的回應
  }
}

function isDocumentRequest(request, url) {
  return (
    request.mode === "navigate" ||
    request.headers.get("RSC") !== null ||
    url.searchParams.has("_rsc")
  );
}

async function fromNetworkOnly(request) {
  return fetch(request);
}

async function fromCacheFirst(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (await isCacheable(response)) {
    event.waitUntil(putSafe(cache, request, response));
  }
  return response;
}

async function fromStaleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);

  const refreshed = fetch(request)
    .then(async (response) => {
      if (await isCacheable(response)) {
        await putSafe(cache, request, response);
      }
      return response;
    })
    .catch(() => null);

  if (hit) {
    event.waitUntil(refreshed);
    return hit;
  }

  const response = await refreshed;
  if (!response) {
    throw new Error("Network request failed and no cached response available");
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fromNetworkOnly(request));
    return;
  }

  if (isDocumentRequest(request, url)) {
    event.respondWith(fromNetworkOnly(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(fromCacheFirst(event, request));
    return;
  }

  event.respondWith(fromStaleWhileRevalidate(event, request));
});
